/**
 * 看板 OCR の後処理（純粋関数）。
 *
 * Tesseract の日本語モデルには決まった癖があり、そのまま出すと現場で
 * 手直しの量が増えます。ここで機械的に直せるところだけ直し、
 * 判断が要るところは人のレビューに回します。
 */

/** 丸囲み数字 → 半角数字。日本語モデルは数字を丸囲みで返すことが多い。 */
const CIRCLED: Record<string, string> = {
  '⓪': '0', '①': '1', '②': '2', '③': '3', '④': '4',
  '⑤': '5', '⑥': '6', '⑦': '7', '⑧': '8', '⑨': '9',
  '⑩': '10', '⑪': '11', '⑫': '12', '⑬': '13', '⑭': '14',
  '⑮': '15', '⑯': '16', '⑰': '17', '⑱': '18', '⑲': '19', '⑳': '20',
};

const CJK = /[぀-ヿ㐀-䶿一-鿿豈-﫿]/;

/** 全角英数・記号を半角へ。丸囲み数字も開く。 */
export function normalizeOcrText(input: string): string {
  let out = '';
  for (const ch of input) {
    if (CIRCLED[ch]) {
      out += CIRCLED[ch];
      continue;
    }
    const code = ch.codePointAt(0)!;
    // 全角 ！(FF01) 〜 ～(FF5E) を半角へ
    if (code >= 0xff01 && code <= 0xff5e) {
      out += String.fromCodePoint(code - 0xfee0);
      continue;
    }
    // 全角スペース
    out += code === 0x3000 ? ' ' : ch;
  }
  return out;
}

/** 1文字だけの日本語トークン。Tesseract の1文字ずつの分割はこの形で出てくる。 */
function isSingleCjk(token: string): boolean {
  return [...token].length === 1 && CJK.test(token);
}

/**
 * 日本語の文字と文字のあいだに入る空白を詰める。
 *
 * Tesseract は「工 事 名 国 道 357 号 線」のように1文字ずつ空けて返してくる。
 * 一方で「国道357号線 舗装改修工事」の空白は語の区切りで、意味がある。
 *
 * 単純に日本語どうしの空白を全部落とすと後者まで潰れるため、
 * 「どちらかが1文字のトークンなら分割ノイズ」と見て、そこだけ詰める。
 * 語として読める長さのトークンが両側にある空白は残す。
 */
export function collapseJapaneseSpacing(input: string): string {
  const tokens = input.split(/ +/).filter(Boolean);
  if (tokens.length === 0) return '';

  let out = tokens[0]!;
  for (let i = 1; i < tokens.length; i += 1) {
    const prev = tokens[i - 1]!;
    const cur = tokens[i]!;
    const noise = isSingleCjk(prev) || isSingleCjk(cur);
    out += noise ? cur : ` ${cur}`;
  }
  return out.trim();
}

export function cleanOcrLine(line: string): string {
  return collapseJapaneseSpacing(normalizeOcrText(line));
}

/**
 * 看板でよく使われる項目名。
 *
 * 表記ゆれを1つの意味にまとめます。実際の看板は会社ごとに言い回しが違い、
 * 「工事名称」「工事名」「件名」がすべて同じ欄を指します。
 */
export const BOARD_LABELS: { key: string; label: string; aliases: string[]; source: string }[] = [
  { key: 'projectName', label: '工事名', source: 'project.name', aliases: ['工事名', '工事名称', '件名', '工事件名'] },
  { key: 'workType', label: '工種', source: 'photo.workType', aliases: ['工種'] },
  { key: 'workKind', label: '種別', source: 'photo.workKind', aliases: ['種別'] },
  { key: 'workDetail', label: '細別', source: 'photo.workDetail', aliases: ['細別', '施工内容', '作業内容'] },
  { key: 'shootingLocation', label: '測点', source: 'photo.shootingLocation', aliases: ['測点', '撮影箇所', '位置', '場所'] },
  { key: 'contractor', label: '施工者', source: 'project.contractorName', aliases: ['施工者', '請負者', '施工業者', '受注者'] },
  { key: 'client', label: '発注者', source: 'project.clientName', aliases: ['発注者'] },
  { key: 'controlValue', label: '施工管理値', source: 'photo.controlValue', aliases: ['施工管理値', '管理値', '規格値', '測定値'] },
  { key: 'designValue', label: '設計寸法', source: 'photo.designValue', aliases: ['設計寸法', '設計値', '設計'] },
  { key: 'measuredValue', label: '実測寸法', source: 'photo.measuredValue', aliases: ['実測寸法', '実測値', '実測'] },
  { key: 'structureNo', label: '橋号・施工状況', source: 'photo.structureNo', aliases: ['橋号', '施工状況'] },
  { key: 'title', label: '写真タイトル', source: 'photo.title', aliases: ['写真タイトル', '表題', 'タイトル'] },
  { key: 'date', label: '日付', source: 'auto.date', aliases: ['日付', '撮影年月日', '年月日', '撮影日'] },
  { key: 'witness', label: '立会者', source: 'manual', aliases: ['立会者', '立会', '監督員'] },
];

export type ExtractedField = {
  key: string;
  label: string;
  source: string;
  value: string;
  /** 0–100。低い項目はレビュー画面で目立たせる。 */
  confidence: number;
  /** 項目名を判別できず、行をそのまま入れた場合。 */
  unmatched: boolean;
};

export type BBox = { x0: number; y0: number; x1: number; y1: number };

export type OcrLine = {
  text: string;
  confidence: number;
  /** 認識できた行の位置。取れない場合は文字の並び順だけで判断します。 */
  bbox?: BBox;
};

type Prepared = {
  text: string;
  confidence: number;
  bbox?: BBox;
  isLabel: boolean;
  alias?: string;
  labelDef?: (typeof BOARD_LABELS)[number];
  /** 1文字違いで項目名とみなした場合。レビューで目立たせるために使う。 */
  fuzzy?: boolean;
};

/** 編集距離が1以内か。looksLike('剱点','測点') のような1文字誤読を拾う。 */
export function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;

  // 長いほうを基準に1文字ずつ照合する
  const [long, short] = a.length >= b.length ? [a, b] : [b, a];
  let i = 0;
  let j = 0;
  let diff = 0;
  while (i < long.length && j < short.length) {
    if (long[i] === short[j]) {
      i += 1;
      j += 1;
      continue;
    }
    diff += 1;
    if (diff > 1) return false;
    i += 1;
    if (long.length === short.length) j += 1; // 置換
  }
  return diff + (long.length - i) + (short.length - j) <= 1;
}

/**
 * 行の先頭が項目名かどうかを判定する。
 *
 * OCR は項目名を1文字だけ読み違えることがよくあります（「測点」→「剱点」）。
 * 項目名の語彙は決まっているので、完全一致が無いときだけ1文字違いを許して
 * 近いものに寄せます。候補が複数並ぶときは寄せません（取り違えのほうが害が大きい）。
 */
function matchLabel(text: string): { def: (typeof BOARD_LABELS)[number]; alias: string; fuzzy: boolean } | null {
  for (const def of BOARD_LABELS) {
    const alias = def.aliases.find((a) => text.startsWith(a));
    if (alias) return { def, alias, fuzzy: false };
  }

  /*
   * 1文字違い。行の「先頭だけ」を見て寄せると、値を項目名と取り違えます。
   * 実際に、工種の値「橋梁補修工」が項目名「橋号」と先頭2文字が
   * 1文字違いだったため項目名として消費され、工種が空になりました。
   *
   * 寄せるのは「行そのものが項目名とほぼ同じ」ときだけにします。
   * 項目名だけの行（「剱点」→「測点」）は拾えて、
   * 後ろに値が続く長い行は拾いません。
   */
  const near: { def: (typeof BOARD_LABELS)[number]; alias: string }[] = [];
  for (const def of BOARD_LABELS) {
    for (const alias of def.aliases) {
      if (alias.length < 2) continue;
      if (withinOneEdit(text, alias)) near.push({ def, alias });
    }
  }

  if (near.length !== 1) return null;
  return { ...near[0]!, fuzzy: true };
}

function prepare(lines: OcrLine[]): Prepared[] {
  return lines
    .map((l) => ({ ...l, text: cleanOcrLine(l.text), confidence: Math.round(l.confidence) }))
    .filter((l) => l.text)
    .map((l) => {
      const matched = matchLabel(l.text);
      return {
        ...l,
        isLabel: Boolean(matched),
        alias: matched?.alias,
        labelDef: matched?.def,
        fuzzy: matched?.fuzzy,
      };
    });
}

/** 項目名のあとに続く区切り記号を落として値にする。 */
function valueAfterAlias(text: string, alias: string): string {
  return text.slice(alias.length).replace(/^[\s:：|/\-—―]+/, '').trim();
}

/** 2つの枠がどれだけ重なっているか（0〜1、小さいほうの面積に対する割合）。 */
function overlapRatio(a: BBox, b: BBox): number {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
  const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
  if (w <= 0 || h <= 0) return 0;
  const areaA = (a.x1 - a.x0) * (a.y1 - a.y0);
  const areaB = (b.x1 - b.x0) * (b.y1 - b.y0);
  const smaller = Math.min(areaA, areaB);
  return smaller > 0 ? (w * h) / smaller : 0;
}

/** 2つの行が同じ段にあるか。中心の高さが互いの高さの範囲に収まるかで見る。 */
function sameRow(a: BBox, b: BBox): boolean {
  const aCenter = (a.y0 + a.y1) / 2;
  const bCenter = (b.y0 + b.y1) / 2;
  const tolerance = Math.max(a.y1 - a.y0, b.y1 - b.y0) * 0.6;
  return Math.abs(aCenter - bCenter) <= tolerance;
}

/**
 * OCR の行から看板の項目を組み立てる。
 *
 * 看板は「項目名 | 記入欄」の表なので、項目名とその値は必ず同じ段にあります。
 * 位置が取れる場合は、同じ段で右側にある行を値として拾います。
 *
 * 文字の並び順だけで対応付けると、認識しそこねた断片が項目名の直後に
 * 紛れ込んだときに、それを値として拾ってしまいます（実際に測点で
 * 「ノハコノいい」を拾い、正しく読めていた「NO.12+5.0m」を取りこぼしていました）。
 *
 * 判別できなかった行も捨てずに「未分類」として残します。読めた文字を
 * 黙って消すと、現場は写真を見比べて打ち直すことになるためです。
 */
export function extractBoardFields(lines: OcrLine[]): ExtractedField[] {
  const prepared = prepare(lines);
  const consumed = new Set<number>();
  const used = new Set<string>();
  const fields: ExtractedField[] = [];

  // まず項目名のある行から埋める。位置が使えるならそれを優先。
  prepared.forEach((line, i) => {
    if (!line.isLabel || !line.labelDef || used.has(line.labelDef.key)) return;

    const def = line.labelDef;
    let value = valueAfterAlias(line.text, line.alias!);
    let confidence = line.confidence;
    consumed.add(i);

    if (!value && line.bbox) {
      // 同じ段で、項目名より右にあるものを探す。
      let bestIndex = -1;
      let bestX = Infinity;
      prepared.forEach((candidate, j) => {
        if (j === i || consumed.has(j) || candidate.isLabel || !candidate.bbox) return;
        if (!sameRow(line.bbox!, candidate.bbox)) return;
        // 少しだけ重なりを許す。枠線の分だけ食い込むことがある。
        if (candidate.bbox.x0 < line.bbox!.x1 - (line.bbox!.x1 - line.bbox!.x0) * 0.5) return;
        if (candidate.bbox.x0 < bestX) { bestX = candidate.bbox.x0; bestIndex = j; }
      });
      if (bestIndex >= 0) {
        value = prepared[bestIndex]!.text;
        confidence = prepared[bestIndex]!.confidence;
        consumed.add(bestIndex);
      }
    }

    /*
     * 位置が取れないときだけ、並び順で補う。
     * 位置が取れているのに同じ段に値が無かった場合は「空欄」が答えで、
     * ここで次の行を拾うと、別の段の値を取り違えて入れてしまう。
     */
    if (!value && !line.bbox) {
      const next = prepared[i + 1];
      if (next && !next.isLabel && !consumed.has(i + 1)) {
        value = next.text;
        confidence = next.confidence;
        consumed.add(i + 1);
      }
    }

    used.add(def.key);
    fields.push({
      key: def.key,
      label: def.label,
      source: def.source,
      value,
      // 項目名を読み違えていた場合は確信度を下げる。値は合っていても、
      // どの欄なのかを人に見てもらう必要があるため。
      confidence: line.fuzzy ? Math.min(confidence, 60) : confidence,
      unmatched: false,
    });
  });

  /*
   * 項目名の枠にほぼ重なっている低確信の断片は、その項目名を
   * 二重に読み違えたものなので落とす。
   * 「測点」の上に「ノハコノいい」が重なって出るのが典型で、
   * 残すとレビュー画面に意味のない行が並ぶ。
   * 重なっていない読み取り結果は、読めた文字を捨てないため必ず残す。
   */
  const labelBoxes = prepared.filter((l) => l.isLabel && l.bbox).map((l) => l.bbox!);
  const isLabelArtifact = (line: Prepared): boolean =>
    Boolean(line.bbox) &&
    line.confidence < 85 &&
    labelBoxes.some((box) => overlapRatio(box, line.bbox!) > 0.6);

  // 残りは未分類として後ろに付ける。
  prepared.forEach((line, i) => {
    if (consumed.has(i)) return;
    if (isLabelArtifact(line)) return;
    fields.push({
      key: `line-${i + 1}`,
      label: '未分類',
      source: 'manual',
      value: line.text,
      confidence: line.confidence,
      unmatched: true,
    });
  });

  return fields;
}
