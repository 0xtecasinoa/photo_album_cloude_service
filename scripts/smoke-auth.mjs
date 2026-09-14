/**
 * 認証まわりのスモークテスト。
 *
 *   npm run smoke:auth
 *
 * 事前に開発サーバーとデータベースを起動し、`npm run db:seed` を実行しておくこと。
 * 新規登録の確認のため、実行のたびにアカウントが1件増えます。
 */
import 'dotenv/config';
import { chromium } from 'playwright-core';

const BASE = process.env.BASE ?? 'http://localhost:3000';
const CHROME = process.env.CHROME_PATH ?? '/usr/bin/google-chrome';
const SEEDED_EMAIL = process.env.SMOKE_EMAIL ?? 'taro.yamada@example.com';
const SEEDED_PASSWORD = process.env.SMOKE_PASSWORD ?? 'password1234';

const results = [];
const check = (name, passed, detail = '') => results.push({ name, passed, detail });
const path = (url) => new URL(url).pathname;

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

/** 毎回まっさらな状態から始めるため、テストごとにコンテキストを作る。 */
async function fresh() {
  const ctx = await browser.newContext({ locale: 'ja-JP' });
  return { ctx, page: await ctx.newPage() };
}

async function submitLogin(page, email, password, query = '') {
  await page.goto(`${BASE}/login${query}`, { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type=submit]');
}

async function alertText(page) {
  await page.waitForTimeout(2500);
  return page.locator('[role=alert]').first().innerText().catch(() => '');
}

try {
  // ---------- 新規登録 ----------
  {
    const { ctx, page } = await fresh();
    await page.goto(`${BASE}/signup`, { waitUntil: 'load' });
    await page.waitForTimeout(1000);
    await page.fill('#name', 'スモーク 太郎');
    await page.fill('#companyName', 'スモーク建設株式会社');
    await page.fill('#email', `smoke-${Date.now()}@example.com`);
    await page.fill('#password', 'password1234');
    await page.click('button[type=submit]');
    await page.waitForURL(/\/dashboard/, { timeout: 30000 }).catch(() => {});
    check('新規登録してそのままログインされる', path(page.url()) === '/dashboard', path(page.url()));
    check('登録直後にアプリ画面が見える', (await page.locator('aside').count()) > 0);
    await ctx.close();
  }

  // ---------- 登録済みメールは拒否 ----------
  {
    const { ctx, page } = await fresh();
    await page.goto(`${BASE}/signup`, { waitUntil: 'load' });
    await page.waitForTimeout(1000);
    await page.fill('#name', '重複 太郎');
    await page.fill('#email', SEEDED_EMAIL);
    await page.fill('#password', 'password1234');
    await page.click('button[type=submit]');
    check('登録済みメールは拒否される', /既に登録/.test(await alertText(page)));
    await ctx.close();
  }

  // ---------- パスワードの長さ ----------
  {
    const { ctx, page } = await fresh();
    await page.goto(`${BASE}/signup`, { waitUntil: 'load' });
    await page.waitForTimeout(1000);
    await page.fill('#name', '短い 太郎');
    await page.fill('#email', `short-${Date.now()}@example.com`);
    await page.fill('#password', '123');
    await page.click('button[type=submit]');
    check('8文字未満のパスワードは拒否される', /8文字以上/.test(await alertText(page)));
    await ctx.close();
  }

  // ---------- ログイン ----------
  {
    const { ctx, page } = await fresh();
    await submitLogin(page, SEEDED_EMAIL, SEEDED_PASSWORD);
    await page.waitForURL(/\/dashboard/, { timeout: 30000 }).catch(() => {});
    check('既存アカウントでログインできる', path(page.url()) === '/dashboard', path(page.url()));

    await page.waitForTimeout(1000);
    const body = await page.locator('body').innerText();
    check('ログイン中のユーザー名が表示される', body.includes('山田 太郎'));
    check('ログイン中のロールが表示される', body.includes('オーナー'));

    // ---------- ログアウト ----------
    await page.click('button[aria-label=ログアウト]');
    await page.waitForURL(/\/login/, { timeout: 30000 }).catch(() => {});
    check('ログアウトできる', path(page.url()) === '/login', path(page.url()));

    await page.goto(`${BASE}/dashboard`, { waitUntil: 'load' });
    await page.waitForTimeout(1000);
    check('ログアウト後は保護画面に入れない', path(page.url()) === '/login', path(page.url()));
    await ctx.close();
  }

  // ---------- 誤ったパスワード / 未登録アドレス ----------
  {
    const { ctx, page } = await fresh();
    await submitLogin(page, SEEDED_EMAIL, 'wrong-password');
    const wrong = await alertText(page);
    check('誤ったパスワードは拒否される', /正しくありません/.test(wrong));
    check('失敗時は /login に留まる', path(page.url()) === '/login');

    await submitLogin(page, 'nobody-here@example.com', 'whatever12345');
    const unknown = await alertText(page);
    // 文言が同じでなければ、どのアドレスが登録済みか判別できてしまう。
    check('未登録アドレスでも文言が同じ', unknown === wrong, unknown.trim().slice(0, 30));
    await ctx.close();
  }

  // ---------- callbackUrl ----------
  {
    const { ctx, page } = await fresh();
    await submitLogin(page, SEEDED_EMAIL, SEEDED_PASSWORD, '?callbackUrl=%2Fprojects');
    await page.waitForURL(/\/projects/, { timeout: 30000 }).catch(() => {});
    check('callbackUrl の遷移先に戻る', path(page.url()) === '/projects', path(page.url()));
    await ctx.close();
  }
  {
    const { ctx, page } = await fresh();
    await page.goto(`${BASE}/login?callbackUrl=https%3A%2F%2Fevil.example.com`, { waitUntil: 'load' });
    await page.waitForTimeout(1000);
    const value = await page.locator('input[name=callbackUrl]').inputValue();
    check('外部URLへのリダイレクトは無効化される', value === '/dashboard', `callbackUrl=${value}`);
    await ctx.close();
  }
} finally {
  await browser.close();
}

for (const r of results) {
  console.log(`  ${r.passed ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  (${r.detail})` : ''}`);
}
const failed = results.filter((r) => !r.passed).length;
console.log(`\n  ${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
