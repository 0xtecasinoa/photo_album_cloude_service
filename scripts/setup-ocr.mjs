/**
 * 手書き看板の読み取りに使う言語データを取得する。
 *
 *   npm run setup:ocr
 *
 * 16MB あり、ライセンスも別（Apache-2.0）なので、リポジトリには入れず
 * ここで取得します。未取得でも取り込み機能は動きます（項目が空欄になるだけ）。
 */
import { mkdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';

const DIR = path.join(process.cwd(), '.tessdata');
const FILE = path.join(DIR, 'jpn.traineddata.gz');
const URL_ = 'https://tessdata.projectnaptha.com/4.0.0/jpn.traineddata.gz';

const existing = await stat(FILE).catch(() => null);
if (existing && existing.size > 1_000_000) {
  console.log(`既に取得済みです: ${FILE} (${(existing.size / 1024 / 1024).toFixed(1)} MB)`);
  process.exit(0);
}

console.log(`取得中: ${URL_}`);
const res = await fetch(URL_);
if (!res.ok) {
  console.error(`取得に失敗しました (HTTP ${res.status})`);
  process.exit(1);
}

await mkdir(DIR, { recursive: true });
await writeFile(FILE, Buffer.from(await res.arrayBuffer()));

const saved = await stat(FILE);
console.log(`保存しました: ${FILE} (${(saved.size / 1024 / 1024).toFixed(1)} MB)`);
