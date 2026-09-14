import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeOcrText,
  collapseJapaneseSpacing,
  cleanOcrLine,
  extractBoardFields,
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
