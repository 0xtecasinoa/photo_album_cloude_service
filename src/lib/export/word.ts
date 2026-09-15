import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ImageRun,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
} from 'docx';
import type { LedgerData, LedgerPhoto } from './types';
import { formatJstDate } from './excel';

/**
 * 工事写真台帳の Word 出力。
 *
 * 発注者によっては「写真に説明文を添えた報告書」を Word で求められます。
 * PDF は体裁が固定で手を入れられないため、先方が文章を書き足す前提の
 * 提出物はこちらを使います。
 */

export type WordExportOptions = {
  /** 1ページあたりの写真枚数。Word は段組みしないので縦に並べます。 */
  photosPerPage?: number;
  title?: string;
};

/** 見出しの下に引く線。表の罫線と紛れないよう細くしておく。 */
const THIN_BORDER = {
  top: { style: BorderStyle.SINGLE, size: 4, color: 'D5DBE7' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D5DBE7' },
  left: { style: BorderStyle.SINGLE, size: 4, color: 'D5DBE7' },
  right: { style: BorderStyle.SINGLE, size: 4, color: 'D5DBE7' },
};

function metaRows(photo: LedgerPhoto): [string, string][] {
  return (
    [
      ['撮影年月日', formatJstDate(photo.takenAt)],
      ['写真区分', photo.category],
      ['工種', photo.workType],
      ['種別', photo.workKind],
      ['細別', photo.workDetail],
      ['撮影箇所', photo.shootingLocation],
      ['施工管理値', photo.controlValue],
      ['設計寸法', photo.designValue],
      ['実測寸法', photo.measuredValue],
    ] as [string, string | null | undefined][]
  ).filter((row): row is [string, string] => Boolean(row[1]));
}

function photoBlock(photo: LedgerPhoto, index: number): (Paragraph | Table)[] {
  const blocks: (Paragraph | Table)[] = [];

  blocks.push(
    new Paragraph({
      spacing: { before: 240, after: 120 },
      children: [
        new TextRun({ text: `写真 ${index + 1}　`, bold: true, size: 24 }),
        new TextRun({ text: photo.title ?? '', bold: true, size: 24 }),
      ],
    }),
  );

  if (photo.bytes) {
    blocks.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 120 },
        children: [
          new ImageRun({
            // docx の型は Buffer を受け付ける。
            data: photo.bytes,
            type: 'jpg',
            // A4 の本文幅に収まる大きさ。3:4 で固定せず、横長を想定した比率にする。
            transformation: { width: 420, height: 315 },
          }),
        ],
      }),
    );
  }

  const rows = metaRows(photo);
  if (rows.length > 0) {
    blocks.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: rows.map(
          ([label, value]) =>
            new TableRow({
              children: [
                new TableCell({
                  width: { size: 28, type: WidthType.PERCENTAGE },
                  borders: THIN_BORDER,
                  shading: { fill: 'F4F6FB' },
                  children: [new Paragraph({ children: [new TextRun({ text: label, size: 18 })] })],
                }),
                new TableCell({
                  width: { size: 72, type: WidthType.PERCENTAGE },
                  borders: THIN_BORDER,
                  children: [new Paragraph({ children: [new TextRun({ text: value, size: 18 })] })],
                }),
              ],
            }),
        ),
      }),
    );
  }

  if (photo.contractorNote) {
    blocks.push(
      new Paragraph({
        spacing: { before: 120, after: 240 },
        children: [new TextRun({ text: photo.contractorNote, size: 20 })],
      }),
    );
  }

  return blocks;
}

export async function exportLedgerWord(
  data: LedgerData,
  options: WordExportOptions = {},
): Promise<Buffer> {
  const { project, photos } = data;
  const perPage = options.photosPerPage ?? 2;

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 120 },
      children: [new TextRun({ text: options.title ?? '工事写真台帳', bold: true, size: 32 })],
    }),
  ];

  const header: [string, string][] = (
    [
      ['工事名', project.name],
      ['工事番号', project.code],
      ['発注者', project.clientName],
      ['請負者', project.contractorName],
      ['施工場所', project.location],
    ] as [string, string | null | undefined][]
  ).filter((row): row is [string, string] => Boolean(row[1]));

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: header.map(
        ([label, value]) =>
          new TableRow({
            children: [
              new TableCell({
                width: { size: 22, type: WidthType.PERCENTAGE },
                borders: THIN_BORDER,
                shading: { fill: 'F4F6FB' },
                children: [new Paragraph({ children: [new TextRun({ text: label, size: 18, bold: true })] })],
              }),
              new TableCell({
                borders: THIN_BORDER,
                children: [new Paragraph({ children: [new TextRun({ text: value, size: 18 })] })],
              }),
            ],
          }),
      ),
    }),
  );

  photos.forEach((photo, i) => {
    children.push(...photoBlock(photo, i));
    /*
     * 指定枚数ごとに改ページする。最後の写真のあとには入れない。
     * 空のページが1枚つくと、そのまま印刷して提出したときに見栄えが悪い。
     */
    const isLast = i === photos.length - 1;
    if (!isLast && (i + 1) % perPage === 0) {
      children.push(new Paragraph({ children: [], pageBreakBefore: true }));
    }
  });

  const doc = new Document({
    creator: 'らくらく写真台帳',
    title: options.title ?? `${project.name} 工事写真台帳`,
    styles: {
      default: {
        document: { run: { font: 'Yu Gothic', size: 20 } },
      },
    },
    sections: [{ children }],
  });

  return Packer.toBuffer(doc) as unknown as Promise<Buffer>;
}
