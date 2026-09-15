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
/*
 * 日本語だけだと、測点や日付の数字が丸囲み（①②）や別の字に化けます。
 * 英数字のモデルを併用すると、NO.12+5.0m のような表記が安定します。
 */
const LANG = 'jpn+eng';

/** 言語データが置かれているか。未設置でも取り込み自体は手入力で続行できる。 */
export function isOcrAvailable(): boolean {
  // jpn+eng のように複合指定されるため、必要なものが全部あるかを見る。
  return LANG.split('+').every(
    (lang) =>
      existsSync(path.join(TESSDATA_DIR, `${lang}.traineddata.gz`)) ||
      existsSync(path.join(TESSDATA_DIR, `${lang}.traineddata`)),
  );
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
 * 1画素=1バイトであることを確かめる。
 *
 * この後の処理はすべて「画素の並び」を前提に添字で触るため、
 * 3チャンネルの配列を渡されると、気づかないまま画像が横にずれて壊れます。
 * 壊れた画像でも OCR は何かしら返してくるので、ここで止めます。
 */
function assertSingleChannel(info: { channels: number; width: number; height: number }): void {
  if (info.channels !== 1) {
    throw new Error(`OCR の前処理は1チャンネルを前提にしています（実際: ${info.channels}）`);
  }
}

/**
 * 白文字の黒板を、黒文字の紙に見立てて反転する。
 *
 * Tesseract は「明るい地に暗い文字」を前提にしており、緑や黒の黒板に
 * 白チョークという現場で一番多い形をそのまま渡すと、ほぼ何も読めません。
 * 全体が暗ければ反転します。
 */
export function shouldInvert(pixels: Uint8Array): boolean {
  let sum = 0;
  // 全画素を舐める必要はない。間引いても平均の傾向は変わらない。
  const step = Math.max(1, Math.floor(pixels.length / 20000));
  let n = 0;
  for (let i = 0; i < pixels.length; i += step) {
    sum += pixels[i]!;
    n += 1;
  }
  return n > 0 && sum / n < 115;
}

/**
 * 傾きを見つける。
 *
 * 現場の看板は正対して撮られることのほうが少なく、数度の傾きでも
 * 行がまとまらず認識が崩れます。
 *
 * 行ごとの暗い画素の数（横方向の投影）を取り、そのばらつきが最大になる
 * 角度を探します。文字行が水平に揃うと「文字のある行」と「余白の行」の
 * 差が最も大きくなる、という性質を使っています。
 */
export function estimateSkew(
  pixels: Uint8Array,
  width: number,
  height: number,
  maxDegrees = 8,
): number {
  const profileVariance = (angleDeg: number): number => {
    const rad = (angleDeg * Math.PI) / 180;
    const tan = Math.tan(rad);
    const rows = new Float64Array(height);

    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) {
        if (pixels[y * width + x]! >= DARK) continue;
        // 角度に応じて行をずらして数える（画像自体は回さない）
        const shifted = Math.round(y - (x - width / 2) * tan);
        if (shifted >= 0 && shifted < height) rows[shifted] += 1;
      }
    }

    let mean = 0;
    for (const v of rows) mean += v;
    mean /= height;
    let variance = 0;
    for (const v of rows) variance += (v - mean) ** 2;
    return variance / height;
  };

  let best = 0;
  let bestScore = -1;
  // まず粗く、次に細かく。全角度を細かく試すと時間がかかりすぎる。
  for (let a = -maxDegrees; a <= maxDegrees; a += 1) {
    const score = profileVariance(a);
    if (score > bestScore) { bestScore = score; best = a; }
  }
  for (let a = best - 1; a <= best + 1; a += 0.25) {
    const score = profileVariance(a);
    if (score > bestScore) { bestScore = score; best = a; }
  }

  // ごく僅かな傾きは回さない。回転のたびに補間で字が甘くなる。
  return Math.abs(best) < 0.5 ? 0 : best;
}

/**
 * 認識前の下ごしらえ。
 *
 * 現場の看板写真は斜めからの撮影や影で沈むことが多いので、
 * グレースケール化と正規化をかけ、表の罫線を落とします。
 * 二値化まで踏み込むと、チョークの薄い字が消えることがあるため行いません。
 */
export async function prepareForOcr(bytes: Buffer): Promise<Buffer> {
  /*
   * 小さい画像はそのままだと字が潰れて読めません。
   * 横 1800px を目安に、小さければ引き伸ばします。
   */
  const base = sharp(bytes, { failOn: 'none' })
    .rotate() // EXIF の向きを反映
    .resize({ width: 1800, fit: 'inside', withoutEnlargement: false })
    .grayscale()
    .normalise();

  const first = await base.raw().toBuffer({ resolveWithObject: true });
  assertSingleChannel(first.info);
  let pixels = new Uint8Array(first.data);
  const { width, height } = first.info;

  // 白文字の黒板は反転する。これをしないとほぼ何も読めない。
  const inverted = shouldInvert(pixels);
  if (inverted) {
    for (let i = 0; i < pixels.length; i += 1) pixels[i] = 255 - pixels[i]!;
  }

  // 傾きを戻す。罫線を消す前に行う（罫線は角度を測る手がかりになる）。
  const skew = estimateSkew(pixels, width, height);
  if (skew !== 0) {
    const rotated = await sharp(Buffer.from(pixels), {
      raw: { width, height, channels: 1 },
    })
      // 回転で空く隅は白で埋める。黒だと罫線と誤認する。
      .rotate(-skew, { background: '#ffffff' })
      /*
       * 回転を挟むと sharp は 3チャンネルで返してくる。
       * 1チャンネルのつもりで読むと横方向にずれて画像が壊れるため、
       * ここで必ず戻す。
       */
      .toColourspace('b-w')
      .raw()
      .toBuffer({ resolveWithObject: true });

    assertSingleChannel(rotated.info);
    pixels = new Uint8Array(rotated.data);
    return sharp(
      Buffer.from(removeRuledLines(pixels, rotated.info.width, rotated.info.height)),
      { raw: { width: rotated.info.width, height: rotated.info.height, channels: 1 } },
    )
      .png()
      .toBuffer();
  }

  return sharp(Buffer.from(removeRuledLines(pixels, width, height)), {
    raw: { width, height, channels: 1 },
  })
    .png()
    .toBuffer();
}

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
      // blocks を有効にしないと行の位置が返らず、項目名と値を
      // 段で突き合わせられない（並び順だけの対応付けは取り違える）。
      worker.recognize(prepared, {}, { text: true, blocks: true }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('OCR timed out')), OCR_TIMEOUT_MS),
      ),
    ]);
    const lines = (data.blocks ?? [])
      .flatMap((b) => b.paragraphs ?? [])
      .flatMap((p) => p.lines ?? [])
      .map((l) => ({ text: l.text, confidence: l.confidence, bbox: l.bbox }));

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
