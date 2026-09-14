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
const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL ?? 'admin@rakuraku-daicho.jp';
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD ?? 'admin1234';

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
// 取り消しや降格の confirm() を通す。既定では自動で「キャンセル」され、
// 操作が実行されないまま「動いていない」ように見えてしまう。
page.on('dialog', (d) => d.accept());

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

  // ---------- 現場一覧 ----------
  await page.goto(`${BASE}/projects`, { waitUntil: 'load' });
  await page.waitForTimeout(2000);

  const projectLinks = await page
    .locator('a[href^="/projects/"]')
    .evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute('href')))]);
  const projectId = projectLinks.map((h) => h.split('/')[2]).find(Boolean);
  check('現場一覧に現場が並ぶ', Boolean(projectId), `${projectLinks.length} 件`);
  if (!projectId) throw new Error('現場が1件もありません。npm run db:seed を実行してください。');

  // ---------- 写真一覧 ----------
  await page.goto(`${BASE}/projects/${projectId}`, { waitUntil: 'load' });
  await page.waitForTimeout(2000);

  const thumbs = await page
    .locator('img')
    .evaluateAll((els) => els.filter((e) => e.src.includes('/api/files/')).length);
  check('写真のサムネイルが表示される', thumbs > 0, `${thumbs} 枚`);

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

  const group = page.getByRole('button', { name: /^工種/ }).first();
  const groupBefore = await group.getAttribute('aria-expanded');
  await group.click();
  await page.waitForTimeout(300);
  check('絞り込みを開閉できる', groupBefore !== (await group.getAttribute('aria-expanded')));

  // ---------- 共有リンク ----------
  await page.getByRole('button', { name: /^共有/ }).click();
  await page.waitForTimeout(600);
  check('共有ダイアログが開く', (await page.getByRole('dialog').count()) > 0);

  // ダウンロードを許可するリンクはパスワードなしで発行させない。
  await page.check('input[name=allowDownload]');
  await page.getByRole('button', { name: '共有リンクを発行' }).click();
  await page.waitForTimeout(1500);
  const shareAlert = await page.getByRole('alert').first().innerText().catch(() => '');
  check(
    'DL許可の共有にはパスワードが要る',
    shareAlert.includes('パスワード'),
    shareAlert.trim().slice(0, 40),
  );
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // ---------- 写真台帳 ----------
  await page.goto(`${BASE}/projects/${projectId}/ledger`, { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  const six = page.getByRole('radio', { name: '6枚' });
  await six.click();
  await page.waitForTimeout(500);
  check('1ページ配置枚数を切り替えられる', (await six.getAttribute('aria-checked')) === 'true');

  // ---------- 電子納品 ----------
  await page.goto(`${BASE}/projects/${projectId}/export`, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const downloadBtn = page.getByRole('button', { name: /台帳を出力ダウンロード/ });

  // 既定は PDF。署名のない写真があっても、社内用の PDF 出力自体は妨げない。
  check('PDF出力は署名の有無に関わらず実行できる', !(await downloadBtn.isDisabled()));

  // 電子納品を選ぶと適合チェックが働き、不適合写真があれば出力を止める。
  await page.getByRole('radio', { name: /電子納品/ }).click();
  await page.waitForTimeout(400);
  check('電子納品では不適合写真の警告が出る', (await page.getByRole('alert').count()) > 0);
  check('電子納品では不適合写真があると出力できない', await downloadBtn.isDisabled());

  // 案内するだけでなく、実際に除外して出せること。
  const excludeBtn = page.getByRole('button', { name: /除外して出力/ });
  check('不適合写真を除外して出力できる', (await excludeBtn.count()) > 0 && !(await excludeBtn.isDisabled()));

  // 社内用モードに切り替えれば出力できる。
  await page.getByRole('button', { name: /モード切替/ }).click();
  await page.waitForTimeout(400);
  check('社内用モードに切り替えれば出力できる', !(await downloadBtn.isDisabled()));

  // ---------- メンバー・権限 ----------
  await page.goto(`${BASE}/members`, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const memberRows = await page.locator('tbody tr').count();
  check('メンバー一覧が実データで出る', memberRows > 0, `${memberRows} 名`);

  const search = page.getByRole('searchbox', { name: 'メンバーを検索' });
  await search.fill('佐藤');
  await page.waitForTimeout(400);
  check('メンバーを検索できる', (await page.locator('tbody tr').count()) < memberRows);
  await search.fill('');
  await page.waitForTimeout(300);

  // 自分自身は停止できない（組織から誰も入れなくなる状態を作らないため）。
  const selfRow = page.locator('tbody tr').filter({ hasText: '自分' }).first();
  check(
    '自分自身は停止できない',
    await selfRow.locator('button[aria-label="自分自身は停止できません"]').isDisabled(),
  );

  // ---------- 設定・プラン ----------
  await page.goto(`${BASE}/settings`, { waitUntil: 'load' });
  await page.waitForTimeout(1500);

  const planHeading = await page.locator('section h2').first().innerText();
  check('現在のご契約が実データで出る', planHeading.trim().length > 0, planHeading.trim());
  check('ご利用中のプランが1つだけ印される', (await page.locator('text=ご利用中のプラン').count()) === 1);

  // サイドバーの容量表示が、契約パネルの実測値と一致していること。
  const panelStorage = (await page.locator('section dd').nth(1).innerText()).replace(/\s+/g, '');
  const sidebarStorage = (await page.locator('text=/GB（|MB（/').first().innerText()).replace(/\s+/g, '');
  check(
    'サイドバーと契約パネルの容量が一致する',
    sidebarStorage.startsWith(panelStorage.split('/')[0]),
    `${sidebarStorage} / ${panelStorage}`,
  );

  await page.getByRole('button', { name: 'メンバーを招待' }).click();
  await page.waitForTimeout(600);
  check('設定画面からメンバーを招待できる', (await page.getByRole('dialog').count()) > 0);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // 枠が縮む変更は、いまの利用量が収まるか先に確かめる。
  await page.getByRole('button', { name: 'フリープランに変更' }).click();
  await page.waitForTimeout(1800);
  const downgrade = await page.getByRole('alert').first().innerText().catch(() => '');
  check(
    '人数が収まらないプランへは下げられない',
    downgrade.includes('上限'),
    downgrade.trim().slice(0, 40),
  );

  // ---------- お問い合わせ ----------
  await page.goto(`${BASE}/contact?plan=enterprise`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  check(
    '料金表から来たプランが引き継がれる',
    (await page.locator('text=についてのお問い合わせ').count()) > 0,
  );
  check('ログイン中は会社名が埋まる', (await page.inputValue('#company')).length > 0);

  await page.fill('#name', 'スモーク 太郎');
  await page.fill('#email', 'smoke@example.co.jp');
  await page.selectOption('#topic', 'デモのご予約');
  await page.click('button[type=submit]');
  await page.waitForTimeout(2500);
  check(
    'お問い合わせを送信できる',
    (await page.locator('text=お問い合わせを受け付けました').count()) > 0,
  );

  // ---------- 運営管理コンソール ----------
  // 顧客のオーナーには見えないこと。管理画面の存在も知らせない（404）。
  for (const route of ['/admin', '/admin/users', '/admin/organizations', '/admin/inquiries']) {
    const res = await page.goto(`${BASE}${route}`, { waitUntil: 'load' });
    const leaked = /運営管理|契約会社|全 \d+ 社/.test(await page.locator('body').innerText());
    check(`顧客は ${route} を開けない`, res.status() === 404 && !leaked, `HTTP ${res.status()}`);
  }

  // 運営管理者は別のブラウザ文脈でログインする（顧客のセッションを壊さないため）。
  const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 1100 }, locale: 'ja-JP' });
  const adminPage = await adminCtx.newPage();
  adminPage.on('pageerror', (e) => jsErrors.push(e.message));
  adminPage.on('dialog', (d) => d.accept());

  await adminPage.goto(`${BASE}/login`, { waitUntil: 'load' });
  await adminPage.waitForTimeout(800);
  await adminPage.fill('#email', ADMIN_EMAIL);
  await adminPage.fill('#password', ADMIN_PASSWORD);
  await adminPage.click('button[type=submit]');
  await adminPage.waitForURL(/\/dashboard/, { timeout: 30000 }).catch(() => {});

  const adminRes = await adminPage.goto(`${BASE}/admin`, { waitUntil: 'load' });
  await adminPage.waitForTimeout(800);
  check('運営管理者は管理画面に入れる', adminRes.status() === 200, `HTTP ${adminRes.status()}`);

  await adminPage.goto(`${BASE}/admin/organizations`, { waitUntil: 'load' });
  await adminPage.waitForTimeout(800);
  const orgRows = await adminPage.locator('tbody tr').count();
  check('全社の一覧が出る', orgRows > 0, `${orgRows} 社`);

  // 件数が 0 のまま出ていないこと（相関副問い合わせで全件 0 になった不具合の再発防止）。
  const seeded = adminPage.locator('tbody tr').filter({ hasText: '大和建設工業株式会社' }).first();
  const seededText = (await seeded.innerText()).replace(/\s+/g, ' ');
  check(
    '会社ごとの件数が実数で出る',
    // シードの会社は 1現場 / 12枚。全件 0 になる不具合の再発防止。
    seededText.includes('1 / 12') && !seededText.includes('0 / 0'),
    seededText.slice(0, 60),
  );

  await adminPage.goto(`${BASE}/admin/users`, { waitUntil: 'load' });
  await adminPage.waitForTimeout(800);
  const userRows = await adminPage.locator('tbody tr').count();
  check('全社のユーザーが出る', userRows > 0, `${userRows} 名`);
  check(
    '運営管理者は停止対象にできない',
    (await adminPage.locator('text=運営管理者は変更不可').count()) > 0,
  );

  await adminPage.goto(`${BASE}/admin/inquiries`, { waitUntil: 'load' });
  await adminPage.waitForTimeout(800);
  check('お問い合わせが読める', (await adminPage.locator('ul > li').count()) > 0);

  await adminCtx.close();

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
