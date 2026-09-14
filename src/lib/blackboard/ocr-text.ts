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

/**
 * OCR の行から看板の項目を組み立てる。
 *
 * 判別できなかった行も捨てずに「未分類」として残します。読めた文字を
 * 黙って消すと、現場は写真を見比べて打ち直すことになるためです。
 */
export function extractBoardFields(
  lines: { text: string; confidence: number }[],
): ExtractedField[] {
  const cleaned = lines
    .map((l) => ({ text: cleanOcrLine(l.text), confidence: Math.round(l.confidence) }))
    .filter((l) => l.text);

  const fields: ExtractedField[] = [];
  const used = new Set<string>();
  const consumed = new Set<number>();

  for (let i = 0; i < cleaned.length; i += 1) {
    if (consumed.has(i)) continue;
    const { text, confidence } = cleaned[i]!;

    const match = BOARD_LABELS.find(
      (l) => !used.has(l.key) && l.aliases.some((a) => text.startsWith(a)),
    );

    if (match) {
      const alias = match.aliases.find((a) => text.startsWith(a))!;
      // 項目名のあとに来る区切り（コロン・空白）を落として値にする
      let value = text.slice(alias.length).replace(/^[\s:：|/\-—―]+/, '').trim();

      /*
       * 項目名だけの行になることがある。看板は「項目名 | 記入欄」の表で、
       * 罫線をまたぐと別の行として読まれるため。
       * 直後の行が他の項目名でなければ、その行を値として拾う。
       */
      if (!value) {
        const next = cleaned[i + 1];
        const nextIsLabel =
          next && BOARD_LABELS.some((l) => l.aliases.some((a) => next.text.startsWith(a)));
        if (next && !nextIsLabel) {
          value = next.text;
          consumed.add(i + 1);
        }
      }

      used.add(match.key);
      fields.push({
        key: match.key,
        label: match.label,
        source: match.source,
        value,
        confidence,
        unmatched: false,
      });
      continue;
    }

    fields.push({
      key: `line-${fields.length + 1}`,
      label: '未分類',
      source: 'manual',
      value: text,
      confidence,
      unmatched: true,
    });
  }

  return fields;
}
