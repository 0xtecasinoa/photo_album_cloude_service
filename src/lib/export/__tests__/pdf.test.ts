import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLedgerHtml, escapeHtml, chunk, exportLedgerPdf } from '../pdf';
import type { LedgerData, LedgerPhoto } from '../types';

const photo = (over: Partial<LedgerPhoto> = {}): LedgerPhoto => ({
  id: 'p1',
  takenAt: new Date(Date.UTC(2026, 3, 28, 1, 15)),
  category: '施工状況写真',
  workType: '路盤工',
  title: '下層路盤 敷均し状況',
  integrityStatus: 'valid',
  ...over,
});

const data = (n: number): LedgerData => ({
  project: { name: '国道357号線 舗装改修工事', code: 'R6-0412', contractorName: '大和建設工業株式会社' },
  photos: Array.from({ length: n }, (_, i) => photo({ id: `p${i}`, title: `写真${i + 1}` })),
});

test('chunk は端数を最後のページに残す', () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(chunk([], 3), []);
  assert.throws(() => chunk([1], 0), RangeError);
});

test('HTML エスケープでレイアウトが壊れない', () => {
  assert.equal(escapeHtml('<script>alert("x")</script>'),
    '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml('A & B'), 'A &amp; B');
});

test('写真タイトルに含まれる記号がエスケープされる', () => {
  // 現場名に < や & が入ることは実際にある
  const html = buildLedgerHtml({
    project: { name: '橋梁<上部>工事 & 舗装' },
    photos: [photo({ title: 'H<2.50m' })],
  });
  assert.ok(html.includes('橋梁&lt;上部&gt;工事 &amp; 舗装'));
  assert.ok(html.includes('H&lt;2.50m'));
  assert.ok(!html.includes('<上部>'), '生の山括弧が残っていない');
});

test('1ページ配置枚数どおりにページ分割される', () => {
  const countPages = (html: string) => (html.match(/class="page"/g) ?? []).length;

  assert.equal(countPages(buildLedgerHtml(data(6), { photosPerPage: 1 })), 6);
  assert.equal(countPages(buildLedgerHtml(data(6), { photosPerPage: 3 })), 2);
  assert.equal(countPages(buildLedgerHtml(data(6), { photosPerPage: 4 })), 2, '6枚を4枚組で2ページ');
  assert.equal(countPages(buildLedgerHtml(data(6), { photosPerPage: 6 })), 1);
  assert.equal(countPages(buildLedgerHtml(data(7), { photosPerPage: 6 })), 2, '端数は次ページへ');
});

test('段組みが枚数設定に一致する', () => {
  assert.match(buildLedgerHtml(data(4), { photosPerPage: 4 }), /repeat\(2, 1fr\)/);
  assert.match(buildLedgerHtml(data(3), { photosPerPage: 3 }), /repeat\(1, 1fr\)/);
});

test('工事情報と撮影年月日が各ページに出る', () => {
  const html = buildLedgerHtml(data(2), { photosPerPage: 1 });
  const heads = (html.match(/国道357号線 舗装改修工事/g) ?? []).length;
  assert.ok(heads >= 2, 'ページごとに工事名が繰り返される');
  assert.ok(html.includes('2026/04/28'), '撮影年月日は日本時間');
  assert.ok(html.includes('R6-0412'));
});

test('画像が解決できる場合は img、できない場合は枠のみ', () => {
  const withImg = buildLedgerHtml(data(1), { resolveImage: () => 'data:image/jpeg;base64,AAA' });
  assert.ok(withImg.includes('<img class="shot" src="data:image/jpeg;base64,AAA"'));

  const without = buildLedgerHtml(data(1));
  assert.ok(without.includes('shot--empty'));
  assert.ok(!without.includes('<img'));
});

test('実際に PDF を生成できる', async () => {
  const pdf = await exportLedgerPdf(data(5), { photosPerPage: 4 });
  // PDF のマジックナンバー
  assert.equal(pdf.subarray(0, 5).toString('ascii'), '%PDF-');
  assert.ok(pdf.byteLength > 2000, `生成された PDF が小さすぎる (${pdf.byteLength} bytes)`);
  // 2ページ分になっているか（/Type /Page の出現数で確認）
  const pageCount = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  assert.ok(pageCount >= 2, `ページ数が想定より少ない (${pageCount})`);
});
