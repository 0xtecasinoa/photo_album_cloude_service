/**
 * 手書き看板の読み取りに使う言語データを取得する。
 *
 *   npm run setup:ocr
 *
 * 合計 27MB ほどあり、ライセンスも別（Apache-2.0）なので、リポジトリには
 * 入れずここで取得します。未取得でも取り込み機能は動きます
 * （項目が空欄で作成され、手入力になるだけ）。
 */
import { mkdir, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';

const DIR = path.join(process.cwd(), '.tessdata');
const BASE = 'https://tessdata.projectnaptha.com/4.0.0';

/*
 * 日本語だけでは、測点や日付の英数字が丸囲みや仮名に化けます。
 * 英数字のモデルを併用して読ませるため、2つとも必要です。
 */
const LANGS = ['jpn', 'eng'];

await mkdir(DIR, { recursive: true });

for (const lang of LANGS) {
  const file = path.join(DIR, `${lang}.traineddata.gz`);
  const existing = await stat(file).catch(() => null);
  if (existing && existing.size > 1_000_000) {
    console.log(`${lang}: 取得済み (${(existing.size / 1024 / 1024).toFixed(1)} MB)`);
    continue;
  }

  const url = `${BASE}/${lang}.traineddata.gz`;
  console.log(`${lang}: 取得中 ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`${lang}: 取得に失敗しました (HTTP ${res.status})`);
    process.exit(1);
  }

  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  const saved = await stat(file);
  console.log(`${lang}: 保存しました (${(saved.size / 1024 / 1024).toFixed(1)} MB)`);
}

console.log(`\n保存先: ${DIR}`);
