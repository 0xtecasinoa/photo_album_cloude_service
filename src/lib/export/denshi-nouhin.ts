import { create } from 'xmlbuilder2';
import iconv from 'iconv-lite';
import { ZipArchive } from 'archiver';
import { PassThrough } from 'node:stream';
import type { LedgerData, LedgerPhoto } from './types';

/**
 * 電子納品（デジタル写真管理情報基準）の成果品作成。
 *
 * 出力構成:
 *   PHOTO/
 *     PHOTO.XML   写真管理ファイル（Shift_JIS）
 *     PIC/        写真ファイル   P0000001.JPG …
 *     DRA/        参考図ファイル D0000001.JPG …
 *
 * 【重要】タグ構成は デジタル写真管理情報基準 に基づいて実装していますが、
 * 実際の納品前に、発注者が指定する要領の版（適用要領基準）とタグ名・並び順を
 * 必ず突き合わせて検証してください。要領は改訂されるため、`APPLICABLE_STANDARD`
 * と下の組み立て処理が、書き換えるべき唯一の箇所になるよう分離しています。
 */

/** 適用要領基準。発注者の指定に合わせて変更します。 */
export const APPLICABLE_STANDARD = '土木202303';

export const PHOTO_DIR = 'PHOTO';
export const PIC_DIR = `${PHOTO_DIR}/PIC`;
export const DRA_DIR = `${PHOTO_DIR}/DRA`;

/** 写真ファイル名は P + 連番7桁。 */
export function picFilename(serial: number, ext = 'JPG'): string {
  return `P${String(serial).padStart(7, '0')}.${ext.toUpperCase()}`;
}

/** 参考図ファイル名は D + 連番7桁。 */
export function draFilename(serial: number, ext = 'JPG'): string {
  return `D${String(serial).padStart(7, '0')}.${ext.toUpperCase()}`;
}

/** 撮影年月日は YYYY-MM-DD（日本時間）。 */
export function nouhinDate(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d);
  return parts; // en-CA gives YYYY-MM-DD
}

export class NonCompliantPhotoError extends Error {
  constructor(public readonly photos: { id: string; reason: string }[]) {
    super(
      `電子納品に適合しない写真が ${photos.length} 枚含まれています。` +
        `対象を除外するか、社内用モードで出力してください。`,
    );
    this.name = 'NonCompliantPhotoError';
  }
}

/**
 * 電子納品に含められない写真を洗い出す。
 *
 * デジタル署名が検証できない写真（外部で加工された写真、署名のない写真）は
 * 成果品に含められません。出力を止めるのはここだけです。
 */
export function findNonCompliant(photos: LedgerPhoto[]): { id: string; reason: string }[] {
  const problems: { id: string; reason: string }[] = [];
  for (const p of photos) {
    if (p.integrityStatus === 'invalid') {
      problems.push({ id: p.id, reason: 'デジタル署名の検証に失敗しました（改ざんの可能性）' });
    } else if (p.integrityStatus === 'unsigned') {
      problems.push({ id: p.id, reason: '小黒板情報の電子署名がありません' });
    } else if (p.integrityStatus === 'pending' || p.integrityStatus === 'error') {
      problems.push({ id: p.id, reason: 'デジタル署名の検証が完了していません' });
    } else if (!p.category) {
      problems.push({ id: p.id, reason: '写真区分が設定されていません' });
    }
  }
  return problems;
}

/**
 * 写真の実体が取得できなかった場合のエラー。
 *
 * PHOTO.XML には載っているのに PIC に実体がない ZIP は、発注者の
 * チェックで必ず弾かれます。黙って欠けたまま出すほうが被害が大きいので、
 * ここで止めます。
 */
export class MissingPhotoFileError extends Error {
  constructor(public readonly photos: { id: string; label: string }[]) {
    super(
      `写真ファイルを読み込めなかった写真が ${photos.length} 枚あります。` +
        `再アップロードのうえ、もう一度出力してください。`,
    );
    this.name = 'MissingPhotoFileError';
  }
}

export type PhotoXmlOptions = {
  /** 適用要領基準。既定は APPLICABLE_STANDARD。 */
  standard?: string;
};

/**
 * PHOTO.XML を組み立てる（文字列）。
 * 実バイト列は必ず Shift_JIS で書き出してください（encodePhotoXml）。
 */
export function buildPhotoXml(data: LedgerData, options: PhotoXmlOptions = {}): string {
  const root = create({ version: '1.0', encoding: 'Shift_JIS' }).ele('photodata');

  root
    .ele('基礎情報')
    .ele('写真フォルダ名').txt(PIC_DIR).up()
    .ele('参考図フォルダ名').txt(DRA_DIR).up()
    .ele('適用要領基準').txt(options.standard ?? APPLICABLE_STANDARD).up()
    .up();

  let draSerial = 0;

  data.photos.forEach((photo, i) => {
    const serial = i + 1;
    const info = root.ele('写真情報');

    const fileInfo = info.ele('写真ファイル情報');
    fileInfo.ele('写真ファイル名').txt(picFilename(serial)).up();
    fileInfo
      .ele('写真ファイル日本語名')
      .txt(photo.originalFilename ?? photo.title ?? picFilename(serial))
      .up();
    fileInfo.ele('シリアル番号').txt(String(serial)).up();
    fileInfo.up();

    for (const drawing of photo.referenceDrawings ?? []) {
      draSerial += 1;
      const ref = info.ele('参考図情報');
      ref.ele('参考図ファイル名').txt(draFilename(draSerial, drawing.extension)).up();
      ref.ele('参考図ファイル日本語名').txt(drawing.name).up();
      ref.up();
    }

    info.ele('写真-大分類').txt(photo.largeClass ?? '工事').up();
    info.ele('写真区分').txt(photo.category ?? '').up();
    info.ele('工種').txt(photo.workType ?? '').up();
    info.ele('種別').txt(photo.workKind ?? '').up();
    info.ele('細別').txt(photo.workDetail ?? '').up();
    info.ele('写真タイトル').txt(photo.title ?? '').up();
    info.ele('撮影箇所').txt(photo.shootingLocation ?? '').up();
    info.ele('施工管理値').txt(photo.controlValue ?? '').up();
    info.ele('撮影年月日').txt(nouhinDate(photo.takenAt)).up();
    // 代表写真・提出頻度写真は 1 / 0 のフラグ。
    info.ele('代表写真').txt(photo.isRepresentative ? '1' : '0').up();
    info.ele('提出頻度写真').txt(photo.isFrequencySubmission ? '1' : '0').up();
    info.ele('請負者説明文').txt(photo.contractorNote ?? '').up();
    info.up();
  });

  return root.end({ prettyPrint: true });
}

/** PHOTO.XML を要領どおり Shift_JIS で書き出す。 */
export function encodePhotoXml(xml: string): Buffer {
  return iconv.encode(xml, 'Shift_JIS');
}

export type NouhinOptions = PhotoXmlOptions & {
  /**
   * 適合チェックを行うか。公共工事では true（既定）。
   * 社内用出力に限り false にできます。
   */
  enforceCompliance?: boolean;
};

/**
 * 電子納品 ZIP を生成する。
 *
 * 写真の原本はそのまま収録します。再圧縮は改ざん検知の署名を壊すうえ、
 * 要領上も写真の編集にあたるためです。
 */
export async function buildDenshiNouhinZip(
  data: LedgerData,
  options: NouhinOptions = {},
): Promise<Buffer> {
  const enforce = options.enforceCompliance ?? true;

  if (enforce) {
    const problems = findNonCompliant(data.photos);
    if (problems.length > 0) throw new NonCompliantPhotoError(problems);
  }

  // 実体のない写真が1枚でもあれば成果品として成立しないため、組み立てる前に止める。
  const missing = data.photos
    .filter((p) => !p.bytes)
    .map((p) => ({ id: p.id, label: p.title || p.originalFilename || p.id }));
  if (missing.length > 0) throw new MissingPhotoFileError(missing);

  const xml = buildPhotoXml(data, options);

  const archive = new ZipArchive({ zlib: { level: 9 } });
  const stream = new PassThrough();
  const chunks: Buffer[] = [];
  stream.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<void>((resolve, reject) => {
    stream.on('end', resolve);
    stream.on('error', reject);
    archive.on('error', reject);
  });
  archive.pipe(stream);

  archive.append(encodePhotoXml(xml), { name: `${PHOTO_DIR}/PHOTO.XML` });

  let draSerial = 0;
  data.photos.forEach((photo, i) => {
    // bytes は上で必ず存在を確認済み。
    archive.append(photo.bytes!, { name: `${PIC_DIR}/${picFilename(i + 1)}` });
    for (const drawing of photo.referenceDrawings ?? []) {
      draSerial += 1;
      // 実体がない参考図は XML には載るが DRA には入らない。呼び出し側が
      // ストレージから bytes を解決して渡す責務。
      if (drawing.bytes) {
        archive.append(drawing.bytes, {
          name: `${DRA_DIR}/${draFilename(draSerial, drawing.extension)}`,
        });
      }
    }
  });

  await archive.finalize();
  await done;
  return Buffer.concat(chunks);
}
