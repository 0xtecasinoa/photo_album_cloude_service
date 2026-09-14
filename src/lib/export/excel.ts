import ExcelJS from 'exceljs';
import type { LedgerData, LedgerPhoto, PhotosPerPage } from './types';

/**
 * 工事写真台帳の Excel 出力。
 *
 * 発注者ごとに台帳の書式が異なるため、既定の体裁で出力しつつ、
 * `templateBuffer` を渡した場合はその雛形に差し込みます。
 * 書式を固定してしまうと、書式の違うお客様がそのまま離脱するためです。
 */

export type ExcelExportOptions = {
  photosPerPage?: PhotosPerPage;
  /** 既存の .xlsx 雛形。渡された場合はプレースホルダを置換します。 */
  templateBuffer?: Buffer;
  /** 雛形内のプレースホルダ書式。既定は {{工事名}} 形式。 */
  placeholderPattern?: RegExp;
  sheetName?: string;
};

const JST = 'Asia/Tokyo';

export function formatJstDate(d: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: JST, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d).replace(/\//g, '/');
}

export function formatJstDateTime(d: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: JST, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(d);
}

/** 写真1枚が台帳上で占める行の内容。 */
export function photoRowValues(photo: LedgerPhoto, index: number): (string | number)[] {
  return [
    index + 1,
    '', // 写真列。画像は addImage で重ねるため、値は空のまま。
    formatJstDate(photo.takenAt),
    photo.category ?? '',
    photo.workType ?? '',
    photo.workKind ?? '',
    photo.workDetail ?? '',
    photo.title ?? '',
    photo.shootingLocation ?? '',
    photo.controlValue ?? '',
    photo.contractorNote ?? '',
    photo.isRepresentative ? '○' : '',
  ];
}

const HEADERS = [
  'No.', '写真', '撮影年月日', '写真区分', '工種', '種別', '細別',
  '写真タイトル', '撮影箇所', '施工管理値', '請負者説明文', '代表写真',
];

/** 写真列のセルサイズ（Excel の列幅・行高の単位）。 */
const PHOTO_COL_WIDTH = 30;
const PHOTO_ROW_HEIGHT = 96;

/** 雛形に差し込むための値。{{工事名}} などのキーで参照されます。 */
export function templateValues(data: LedgerData): Record<string, string> {
  const { project, photos } = data;
  const dates = photos.map((p) => p.takenAt.getTime());
  return {
    工事名: project.name,
    工事番号: project.code ?? '',
    発注者名: project.clientName ?? '',
    請負者名: project.contractorName ?? '',
    施工場所: project.location ?? '',
    工期開始: project.startDate ? formatJstDate(project.startDate) : '',
    工期終了: project.endDate ? formatJstDate(project.endDate) : '',
    写真枚数: String(photos.length),
    出力日: formatJstDate(new Date()),
    撮影開始日: dates.length ? formatJstDate(new Date(Math.min(...dates))) : '',
    撮影終了日: dates.length ? formatJstDate(new Date(Math.max(...dates))) : '',
  };
}

/** 雛形のセル文字列からプレースホルダを置換する。 */
export function fillPlaceholders(
  text: string,
  values: Record<string, string>,
  pattern = /\{\{\s*([^}\s]+)\s*\}\}/g,
): string {
  return text.replace(pattern, (whole, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? values[key]! : whole,
  );
}

export async function buildLedgerWorkbook(
  data: LedgerData,
  options: ExcelExportOptions = {},
): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();

  if (options.templateBuffer) {
    // 雛形差し込み: お客様の書式をそのまま活かす。
    await workbook.xlsx.load(options.templateBuffer as unknown as ArrayBuffer);
    const values = templateValues(data);
    workbook.eachSheet((sheet) => {
      sheet.eachRow({ includeEmpty: false }, (row) => {
        row.eachCell({ includeEmpty: false }, (cell) => {
          if (typeof cell.value === 'string') {
            cell.value = fillPlaceholders(cell.value, values, options.placeholderPattern);
          }
        });
      });
    });
    return workbook;
  }

  workbook.creator = 'らくらく写真台帳';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(options.sheetName ?? '工事写真台帳', {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1 },
    views: [{ state: 'frozen', ySplit: 6 }],
  });

  const { project, photos } = data;

  sheet.mergeCells('A1:K1');
  const title = sheet.getCell('A1');
  title.value = '工事写真台帳';
  title.font = { size: 16, bold: true };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 28;

  const meta: [string, string][] = [
    ['工事名', project.name],
    ['工事番号', project.code ?? ''],
    ['発注者名', project.clientName ?? ''],
    ['請負者名', project.contractorName ?? ''],
  ];
  meta.forEach(([label, value], i) => {
    const row = 2 + Math.floor(i / 2);
    const col = (i % 2) * 5 + 1;
    const labelCell = sheet.getRow(row).getCell(col);
    labelCell.value = label;
    labelCell.font = { bold: true };
    sheet.getRow(row).getCell(col + 1).value = value;
  });

  const headerRow = sheet.getRow(6);
  HEADERS.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8B' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });
  headerRow.height = 22;

  const widths = [6, PHOTO_COL_WIDTH, 14, 16, 14, 14, 14, 24, 18, 16, 30, 10];
  widths.forEach((w, i) => (sheet.getColumn(i + 1).width = w));

  photos.forEach((photo, i) => {
    const row = sheet.getRow(7 + i);
    photoRowValues(photo, i).forEach((v, c) => {
      const cell = row.getCell(c + 1);
      cell.value = v;
      cell.alignment = { vertical: 'middle', wrapText: c === 10 };
      cell.border = { top: { style: 'hair' }, bottom: { style: 'hair' }, left: { style: 'hair' }, right: { style: 'hair' } };
    });

    /*
     * 写真そのものを差し込む。
     * 写真のない「工事写真台帳」は提出物として成立しないため、
     * 実体が渡ってきている場合は必ずセルに載せる。
     */
    if (photo.bytes) {
      row.height = PHOTO_ROW_HEIGHT;
      const imageId = workbook.addImage({ buffer: photo.bytes as unknown as ArrayBuffer, extension: 'jpeg' });
      sheet.addImage(imageId, {
        // 列・行は 0 始まり。写真列は B 列（index 1）。
        tl: { col: 1.05, row: 6 + i + 0.08 },
        ext: { width: 196, height: 120 },
        editAs: 'oneCell',
      });
    }
  });

  return workbook;
}

export async function exportLedgerExcel(
  data: LedgerData,
  options: ExcelExportOptions = {},
): Promise<Buffer> {
  const workbook = await buildLedgerWorkbook(data, options);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
