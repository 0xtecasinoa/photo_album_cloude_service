import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeOcrText,
  collapseJapaneseSpacing,
  cleanOcrLine,
  extractBoardFields,
  withinOneEdit,
} from '../ocr-text';

test('丸囲み数字は半角数字に開かれる', () => {
  // 日本語モデルは数字を丸囲みで返すことが多く、そのままでは測点も日付も使えない。
  assert.equal(normalizeOcrText('N0.①②+⑤.0m'), 'N0.12+5.0m');
  assert.equal(normalizeOcrText('⑳②⑥/0④/②⑧'), '2026/04/28');
});

test('全角英数は半角になる', () => {
  assert.equal(normalizeOcrText('ＮＯ．１２'), 'NO.12');
  assert.equal(normalizeOcrText('路盤工　下層'), '路盤工 下層');
});

test('1文字ずつに割られた行はつなぎ直す', () => {
  assert.equal(collapseJapaneseSpacing('工 事 名'), '工事名');
  // 数字を挟んでいても、1文字トークンが隣にあれば分割ノイズとして詰める
  assert.equal(collapseJapaneseSpacing('国 道 357 号 線'), '国道357号線');
});

test('語として読める長さのトークンのあいだの空白は残す', () => {
  // ここを詰めると「国道357号線舗装改修工事」になり、語の切れ目が消える
  assert.equal(
    collapseJapaneseSpacing('国道357号線 舗装改修工事'),
    '国道357号線 舗装改修工事',
  );
  assert.equal(collapseJapaneseSpacing('NO.12 + 5.0m'), 'NO.12 + 5.0m');
});

test('項目名と値に分かれる', () => {
  const fields = extractBoardFields([
    { text: '工 事 名 国道357号線 舗装改修工事', confidence: 92 },
    { text: '工 種 路盤工', confidence: 88 },
    { text: '測 点 N0.①②+⑤.0m', confidence: 71 },
  ]);

  assert.equal(fields[0]!.key, 'projectName');
  assert.equal(fields[0]!.value, '国道357号線 舗装改修工事');
  assert.equal(fields[1]!.key, 'workType');
  assert.equal(fields[1]!.value, '路盤工');
  assert.equal(fields[2]!.key, 'shootingLocation');
  assert.equal(fields[2]!.value, 'N0.12+5.0m');
  assert.equal(fields[2]!.confidence, 71);
});

test('表記ゆれも同じ項目にまとまる', () => {
  const fields = extractBoardFields([
    { text: '工事名称 ○○橋梁上部工事', confidence: 90 },
    { text: '受注者：大和建設工業', confidence: 85 },
  ]);
  assert.equal(fields[0]!.key, 'projectName');
  assert.equal(fields[1]!.key, 'contractor');
  assert.equal(fields[1]!.value, '大和建設工業', '区切り記号は値に残さない');
});

test('判別できない行も捨てずに残す', () => {
  // 読めた文字を黙って消すと、現場は写真を見比べて打ち直すことになる。
  const fields = extractBoardFields([{ text: '晴天 気温22度', confidence: 64 }]);
  assert.equal(fields.length, 1);
  assert.equal(fields[0]!.unmatched, true);
  assert.equal(fields[0]!.value, '晴天 気温22度');
});

test('同じ項目名が2回出ても最初の1回だけ割り当てる', () => {
  const fields = extractBoardFields([
    { text: '工種 路盤工', confidence: 90 },
    { text: '工種 舗装工', confidence: 60 },
  ]);
  assert.equal(fields[0]!.key, 'workType');
  assert.equal(fields[1]!.unmatched, true, '2行目は未分類として残す');
});

test('空行は項目にならない', () => {
  assert.equal(extractBoardFields([{ text: '   ', confidence: 0 }]).length, 0);
  assert.equal(cleanOcrLine('  　 '), '');
});

test('項目名だけの行は、次の行を値として拾う', () => {
  // 看板は「項目名 | 記入欄」の表で、罫線をまたぐと別の行として読まれる。
  const fields = extractBoardFields([
    { text: '工 事 名', confidence: 93 },
    { text: '国道357号線 舗装改修工事', confidence: 93 },
    { text: '工 種', confidence: 90 },
    { text: '路盤工', confidence: 90 },
  ]);

  assert.equal(fields.length, 2);
  assert.equal(fields[0]!.key, 'projectName');
  assert.equal(fields[0]!.value, '国道357号線 舗装改修工事');
  assert.equal(fields[1]!.key, 'workType');
  assert.equal(fields[1]!.value, '路盤工');
});

test('項目名が連続していたら、次の項目名を値として食べない', () => {
  const fields = extractBoardFields([
    { text: '工事名', confidence: 90 },
    { text: '工種', confidence: 90 },
    { text: '路盤工', confidence: 90 },
  ]);

  assert.equal(fields[0]!.key, 'projectName');
  assert.equal(fields[0]!.value, '', '空欄のまま残す');
  assert.equal(fields[1]!.key, 'workType');
  assert.equal(fields[1]!.value, '路盤工');
});

test('1文字違いの判定', () => {
  assert.equal(withinOneEdit('測点', '測点'), true);
  assert.equal(withinOneEdit('剱点', '測点'), true, '1文字の読み違い');
  assert.equal(withinOneEdit('測', '測点'), true, '1文字の欠落');
  assert.equal(withinOneEdit('測点数', '測点'), true, '1文字の混入');
  assert.equal(withinOneEdit('工種', '測点'), false, '2文字違いは別物');
  assert.equal(withinOneEdit('', '測点'), false);
});

test('項目名を1文字読み違えても値を拾える', () => {
  // 実測で起きた例。値は正しく読めているのに、項目名が「剱点」になって
  // 対応付けに失敗していた。
  const fields = extractBoardFields([
    { text: '剱点', confidence: 78, bbox: { x0: 94, y0: 543, x1: 228, y1: 609 } },
    { text: 'NO.12+5.0m', confidence: 91, bbox: { x0: 569, y0: 549, x1: 989, y1: 604 } },
  ]);

  assert.equal(fields.length, 1);
  assert.equal(fields[0]!.key, 'shootingLocation');
  assert.equal(fields[0]!.value, 'NO.12+5.0m');
  assert.ok(fields[0]!.confidence <= 60, '読み違えた項目は確信度を下げて目立たせる');
});

test('同じ段で右にある行を値として拾う', () => {
  // 並び順だけで対応付けると、項目名の直後にある認識ミスの断片を
  // 値として拾ってしまう（実測で「ノハコノいい」を拾っていた）。
  const fields = extractBoardFields([
    { text: '測点', confidence: 94, bbox: { x0: 95, y0: 542, x1: 228, y1: 609 } },
    { text: 'ノハコノいい', confidence: 80, bbox: { x0: 107, y0: 592, x1: 231, y1: 609 } },
    { text: 'NO.12+5.0m', confidence: 91, bbox: { x0: 573, y0: 549, x1: 972, y1: 604 } },
  ]);

  const point = fields.find((f) => f.key === 'shootingLocation');
  assert.equal(point?.value, 'NO.12+5.0m');
  // 項目名に重なった断片は落とす（別のテストで確認）。
  // ここで見たいのは、並び順ではなく段で値を選べていること。
  assert.equal(fields.length, 1);
});

test('別の段にある行は値として拾わない', () => {
  const fields = extractBoardFields([
    { text: '工種', confidence: 95, bbox: { x0: 94, y0: 324, x1: 232, y1: 390 } },
    { text: '大和建設工業', confidence: 96, bbox: { x0: 569, y0: 762, x1: 995, y1: 828 } },
  ]);
  assert.equal(fields.find((f) => f.key === 'workType')?.value, '', '遠い段からは拾わない');
});

test('項目名より左にある行は値として拾わない', () => {
  // 値は必ず項目名の右側にある。左側にあるものは別の欄。
  const fields = extractBoardFields([
    { text: '日付', confidence: 96, bbox: { x0: 600, y0: 981, x1: 730, y1: 1047 } },
    { text: '余計な文字', confidence: 70, bbox: { x0: 100, y0: 985, x1: 300, y1: 1047 } },
  ]);
  assert.equal(fields.find((f) => f.key === 'date')?.value, '');
});

test('項目名に重なった読み違いの断片は残さない', () => {
  // 「測点」の枠にほぼ重なって「ノハコノいい」が出るのは、項目名を
  // 二重に読み違えたもの。レビュー画面に意味のない行を並べない。
  const fields = extractBoardFields([
    { text: '測点', confidence: 94, bbox: { x0: 95, y0: 542, x1: 228, y1: 609 } },
    { text: 'ノハコノいい', confidence: 80, bbox: { x0: 107, y0: 592, x1: 231, y1: 609 } },
    { text: 'NO.12+5.0m', confidence: 91, bbox: { x0: 573, y0: 549, x1: 972, y1: 604 } },
  ]);

  assert.equal(fields.length, 1);
  assert.equal(fields[0]!.value, 'NO.12+5.0m');
});

test('重なっていない読み取り結果は捨てない', () => {
  // 天候などの欄外メモは、項目名と重なっていなければ残す。
  const fields = extractBoardFields([
    { text: '測点', confidence: 94, bbox: { x0: 95, y0: 542, x1: 228, y1: 609 } },
    { text: 'NO.12+5.0m', confidence: 91, bbox: { x0: 573, y0: 549, x1: 972, y1: 604 } },
    { text: '晴天 気温22度', confidence: 70, bbox: { x0: 95, y0: 900, x1: 500, y1: 960 } },
  ]);

  assert.ok(fields.some((f) => f.unmatched && f.value === '晴天 気温22度'));
});
