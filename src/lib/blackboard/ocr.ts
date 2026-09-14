import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { extractBoardFields, type ExtractedField } from './ocr-text';

/**
 * 手書き看板の読み取り。
 *
 * 認識結果はそのままテンプレートにせず、必ずレビュー画面を通します。
 * 日本語の手書き認識は取り違えが起きるもので、間違ったまま黒板に焼き付けると
 * 成果品の写真すべてが直しになるためです。
 */

export const TESSDATA_DIR = path.join(process.cwd(), '.tessdata');
const LANG = 'jpn';

/** 言語データが置かれているか。未設置でも取り込み自体は手入力で続行できる。 */
export function isOcrAvailable(): boolean {
  return existsSync(path.join(TESSDATA_DIR, `${LANG}.traineddata.gz`))
    || existsSync(path.join(TESSDATA_DIR, `${LANG}.traineddata`));
}

export type OcrResult = {
  available: boolean;
  /** 全体の確信度 0–100。 */
  confidence: number;
  rawText: string;
  fields: ExtractedField[];
};

/** これより暗い画素を「線・文字」とみなす（0=黒, 255=白）。 */
const DARK = 110;
/** 行・列の何割が暗ければ罫線とみなすか。文字の並びは通常ここまで埋まらない。 */
const RULE_COVERAGE = 0.7;
/** 罫線の縁（アンチエイリアス）も一緒に消すための余白。 */
const RULE_BLEED = 2;

/**
 * 罫線を消す。
 *
 * 工事看板は枠と罫線のある表なので、そのまま読ませると横罫線が
 * 「一」や「ー」として認識され、実際の記入内容を押しのけてしまいます。
 * 行・列まるごとが暗い箇所だけを白く塗り、文字には触れません。
 *
 * 引数の配列は破壊的に書き換えます（1枚あたり数MBの確保を避けるため）。
 */
export function removeRuledLines(
  pixels: Uint8Array,
  width: number,
  height: number,
): Uint8Array {
  const whitenRow = (y: number) => {
    if (y < 0 || y >= height) return;
    pixels.fill(255, y * width, y * width + width);
  };
  const whitenCol = (x: number) => {
    if (x < 0 || x >= width) return;
    for (let y = 0; y < height; y += 1) pixels[y * width + x] = 255;
  };

  const rowHits: number[] = [];
  for (let y = 0; y < height; y += 1) {
    let dark = 0;
    for (let x = 0; x < width; x += 1) if (pixels[y * width + x]! < DARK) dark += 1;
    if (dark >= width * RULE_COVERAGE) rowHits.push(y);
  }

  const colHits: number[] = [];
  for (let x = 0; x < width; x += 1) {
    let dark = 0;
    for (let y = 0; y < height; y += 1) if (pixels[y * width + x]! < DARK) dark += 1;
    if (dark >= height * RULE_COVERAGE) colHits.push(x);
  }

  // 判定を終えてから塗る。塗りながら数えると、隣の行の判定が変わってしまう。
  for (const y of rowHits) {
    for (let d = -RULE_BLEED; d <= RULE_BLEED; d += 1) whitenRow(y + d);
  }
  for (const x of colHits) {
    for (let d = -RULE_BLEED; d <= RULE_BLEED; d += 1) whitenCol(x + d);
  }

  return pixels;
}

/**
 * 認識前の下ごしらえ。
 *
 * 現場の看板写真は斜めからの撮影や影で沈むことが多いので、
 * グレースケール化と正規化をかけ、表の罫線を落とします。
 * 二値化まで踏み込むと、チョークの薄い字が消えることがあるため行いません。
 */
export async function prepareForOcr(bytes: Buffer): Promise<Buffer> {
  const base = sharp(bytes, { failOn: 'none' })
    .rotate()
    .resize({ width: 1800, withoutEnlargement: true })
    .grayscale()
    .normalise();

  const { data, info } = await base.raw().toBuffer({ resolveWithObject: true });
  const cleaned = removeRuledLines(new Uint8Array(data), info.width, info.height);

  return sharp(Buffer.from(cleaned), {
    raw: { width: info.width, height: info.height, channels: 1 },
  })
    .png()
    .toBuffer();
}

/**
 * 看板写真を読み取る。
 *
 * tesseract.js はワーカーの起動に数秒かかるため、必要になるまで読み込みません
 * （アプリ起動のたびに WASM を抱えないようにするため）。
 */
/** 1枚あたりの上限。これを超えたら諦めて手入力に回す。 */
const OCR_TIMEOUT_MS = 90_000;

export async function recognizeBoard(bytes: Buffer): Promise<OcrResult> {
  if (!isOcrAvailable()) {
    return { available: false, confidence: 0, rawText: '', fields: [] };
  }

  const { createWorker, PSM } = await import('tesseract.js');
  const prepared = await prepareForOcr(bytes);

  const worker = await createWorker(LANG, 1, {
    langPath: TESSDATA_DIR,
    gzip: true,
    cacheMethod: 'none',
  });

  /*
   * 看板は「項目名 | 記入欄」が並ぶ表で、段組みの文章ではない。
   * 既定の自動解析だと枠に引きずられて行を取り違えるため、
   * まばらな文字列として読ませる。
   */
  await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });

  try {
    /*
     * 認識が返らないまま待ち続けると、アップロードした側は
     * 何も言われずに固まったままになる。上限を切って手入力へ倒す。
     */
    const { data } = await Promise.race([
      worker.recognize(prepared),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('OCR timed out')), OCR_TIMEOUT_MS),
      ),
    ]);
    const lines = (data.blocks ?? [])
      .flatMap((b) => b.paragraphs ?? [])
      .flatMap((p) => p.lines ?? [])
      .map((l) => ({ text: l.text, confidence: l.confidence }));

    // blocks が取れない版もあるため、テキスト全体からの行分割を保険にする。
    const fallback = data.text
      .split('\n')
      .map((text) => ({ text, confidence: data.confidence }));

    return {
      available: true,
      confidence: Math.round(data.confidence),
      rawText: data.text,
      fields: extractBoardFields(lines.length > 0 ? lines : fallback),
    };
  } finally {
    await worker.terminate();
  }
}
