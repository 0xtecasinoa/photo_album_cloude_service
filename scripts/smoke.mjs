/**
 * 画面の実動作スモークテスト。
 *
 * ビルドが通ることではなく、実際にブラウザで操作できることを確認します。
 * 事前に `npm run dev`（または `npm start`）でサーバーを起動しておいてください。
 *
 *   node scripts/smoke.mjs                      # 既定: http://localhost:3000
 *   BASE=http://localhost:3100 node scripts/smoke.mjs
 *
 * 注意: 開発サーバーには必ず `localhost` でアクセスしてください。
 * `127.0.0.1` だと HMR の WebSocket が接続できず、React のハイドレーションが
 * 行われないため、すべての操作が無反応になります。
 */
import 'dotenv/config';
import { chromium } from 'playwright-core';

const BASE = process.env.BASE ?? 'http://localhost:3000';
const CHROME = process.env.CHROME_PATH ?? '/usr/bin/google-chrome';

/** Seeded by `npm run db:seed`. */
const LOGIN_EMAIL = process.env.SMOKE_EMAIL ?? 'taro.yamada@example.com';
const LOGIN_PASSWORD = process.env.SMOKE_PASSWORD ?? 'password1234';

const results = [];
const check = (name, passed, detail = '') => results.push({ name, passed, detail });

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 }, locale: 'ja-JP' });

const page = await ctx.newPage();

// 実際にログインする。セッションを偽造すると、存在しないユーザーIDで
// 通ってしまい、認証まわりの不具合を取りこぼすため。
await page.goto(`${BASE}/login`, { waitUntil: 'load' });
await page.waitForTimeout(1200);
await page.fill('#email', LOGIN_EMAIL);
await page.fill('#password', LOGIN_PASSWORD);
await page.click('button[type=submit]');
await page.waitForURL(/\/dashboard/, { timeout: 30000 }).catch(() => {});
check('ログインできる', new URL(page.url()).pathname === '/dashboard', page.url().replace(BASE, ''));
const jsErrors = [];
page.on('pageerror', (e) => jsErrors.push(e.message));

const boardCells = () =>
  page.evaluate(() => document.querySelector('[style*="grid-template-rows"]')?.children.length ?? 0);
const selectedHeading = () =>
  page.locator('h2').filter({ hasText: '選択中セル' }).first().innerText();

try {
  // ---------- 電子小黒板テンプレート ----------
  await page.goto(`${BASE}/templates`, { waitUntil: 'load' });
  await page.waitForTimeout(2500);

  await page.locator('[style*="grid-template-rows"] > *').nth(2).click();
  await page.waitForTimeout(400);
  check('黒板のセルを選択できる', (await selectedHeading()).includes('測点'));

  await page.locator('#cell-label').fill('測点番号');
  await page.waitForTimeout(400);
  const boardText = await page.locator('[style*="grid-template-rows"]').innerText();
  check('ラベル変更が黒板へ即時反映される', boardText.includes('測点番号'));

  const bold = page.getByRole('button', { name: 'B（太字）' });
  const boldBefore = await bold.getAttribute('aria-pressed');
  await bold.click();
  await page.waitForTimeout(300);
  check('太字トグルが切り替わる', boldBefore !== (await bold.getAttribute('aria-pressed')));

  await page.locator('#cell-size').selectOption({ index: 2 });
  await page.waitForTimeout(300);
  check('文字サイズを変更できる', true);

  const cellsBefore = await boardCells();
  await page.getByRole('button', { name: /新しい項目セルを追加/ }).click();
  await page.waitForTimeout(600);
  const cellsAfter = await boardCells();
  check('項目セルを追加できる', cellsAfter === cellsBefore + 1, `${cellsBefore} → ${cellsAfter}`);

  await page.locator('#tpl-bg').selectOption({ index: 2 });
  await page.waitForTimeout(300);
  const bg = await page.evaluate(
    () => getComputedStyle(document.querySelector('[style*="aspect-ratio"]')).backgroundColor,
  );
  check('背景色を変更できる', bg !== 'rgb(19, 42, 34)', bg);

  const indent = page.locator('#cell-indent');
  await indent.fill('3');
  await indent.dispatchEvent('input');
  await page.waitForTimeout(300);
  check('字下げを変更できる', (await page.locator('label[for=cell-indent]').innerText()).includes('3.0'));

  // ---------- 工事写真台帳 ----------
  await page.goto(`${BASE}/projects`, { waitUntil: 'load' });
  await page.waitForTimeout(2000);

  await page.locator('label').filter({ hasText: 'すべて選択' }).click();
  await page.waitForTimeout(400);
  const selected = await page.locator('text=/枚を選択中/').first().innerText().catch(() => '');
  check('すべて選択が機能する', /枚を選択中/.test(selected), selected.trim());

  await page.getByRole('button', { name: 'リスト表示' }).click();
  await page.waitForTimeout(300);
  check(
    '表示切替（グリッド／リスト）',
    (await page.getByRole('button', { name: 'リスト表示' }).getAttribute('aria-pressed')) === 'true',
  );

  const group = page.getByRole('button', { name: /工種・分類/ });
  const groupBefore = await group.getAttribute('aria-expanded');
  await group.click();
  await page.waitForTimeout(300);
  check('絞り込みを開閉できる', groupBefore !== (await group.getAttribute('aria-expanded')));

  // ---------- 写真台帳 ----------
  await page.goto(`${BASE}/projects/ledger`, { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  const six = page.getByRole('radio', { name: '6枚' });
  await six.click();
  await page.waitForTimeout(500);
  check('1ページ配置枚数を切り替えられる', (await six.getAttribute('aria-checked')) === 'true');

  // ---------- 電子納品 ----------
  await page.goto(`${BASE}/projects/export`, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const downloadBtn = page.getByRole('button', { name: /台帳を出力ダウンロード/ });

  // 既定は PDF。署名のない写真があっても、社内用の PDF 出力自体は妨げない。
  check('PDF出力は署名の有無に関わらず実行できる', !(await downloadBtn.isDisabled()));

  // 電子納品を選ぶと適合チェックが働き、不適合写真があれば出力を止める。
  await page.getByRole('radio', { name: /電子納品/ }).click();
  await page.waitForTimeout(400);
  check('電子納品では不適合写真の警告が出る', (await page.getByRole('alert').count()) > 0);
  check('電子納品では不適合写真があると出力できない', await downloadBtn.isDisabled());

  // 社内用モードに切り替えれば出力できる。
  await page.getByRole('button', { name: /モード切替/ }).click();
  await page.waitForTimeout(400);
  check('社内用モードに切り替えれば出力できる', !(await downloadBtn.isDisabled()));

  // ---------- サービス紹介ページ ----------
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  const q = page.getByRole('button', { name: /セキュリティは安全ですか/ });
  const qBefore = await q.getAttribute('aria-expanded');
  await q.click();
  await page.waitForTimeout(300);
  check('FAQを開閉できる', qBefore !== (await q.getAttribute('aria-expanded')));
} finally {
  await browser.close();
}

for (const r of results) {
  console.log(`  ${r.passed ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  (${r.detail})` : ''}`);
}
const failed = results.filter((r) => !r.passed).length;
console.log(`\n  ${results.length - failed}/${results.length} passed`);
if (jsErrors.length) console.log(`\nJS errors:\n${jsErrors.join('\n')}`);
process.exit(failed || jsErrors.length ? 1 : 0);
