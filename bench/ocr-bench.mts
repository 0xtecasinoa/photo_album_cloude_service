/**
 * 看板 OCR の認識率を測る。
 *
 *   npx tsx bench/ocr-bench.mts
 *
 * 「上がった気がする」で終わらせないため、項目ごとの完全一致率と
 * 文字単位の誤り率（レーベンシュタイン距離）を出します。
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { recognizeBoard } from '@/lib/blackboard/ocr';
import type { BoardCase } from './make-boards.mts';

const cases: BoardCase[] = JSON.parse(
  readFileSync(path.join(process.cwd(), 'bench', 'boards', 'cases.json'), 'utf8'),
);

/** 文字単位の編集距離。文字化けの程度を見るのに使う。 */
function distance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j += 1) dp[0]![j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[a.length]![b.length]!;
}

/** 比較用の正規化。前後の空白と、語中の空白の有無は問わない。 */
const norm = (s: string) => s.replace(/\s+/g, '').trim();

let totalFields = 0;
let exact = 0;
let chars = 0;
let errors = 0;
const perCase: { name: string; hit: number; of: number; ms: number }[] = [];

for (const c of cases) {
  const bytes = readFileSync(c.file);
  const t0 = Date.now();
  const result = await recognizeBoard(bytes);
  const ms = Date.now() - t0;

  const got = new Map(result.fields.map((f) => [f.key, f.value]));
  let hit = 0;
  const lines: string[] = [];

  for (const [key, want] of Object.entries(c.truth)) {
    totalFields += 1;
    const actual = got.get(key) ?? '';
    const ok = norm(actual) === norm(want);
    if (ok) { exact += 1; hit += 1; }
    chars += norm(want).length;
    errors += distance(norm(actual), norm(want));
    lines.push(`    ${ok ? '○' : '×'} ${key.padEnd(18)} 正解「${want}」 認識「${actual}」`);
  }

  perCase.push({ name: c.name, hit, of: Object.keys(c.truth).length, ms });
  console.log(`\n${c.name}  ${hit}/${Object.keys(c.truth).length} 一致  (${ms}ms, 確信度 ${result.confidence})`);
  lines.forEach((l) => console.log(l));
}

console.log('\n' + '='.repeat(60));
for (const p of perCase) {
  console.log(`  ${p.name.padEnd(18)} ${p.hit}/${p.of}  ${p.ms}ms`);
}
console.log('-'.repeat(60));
console.log(`  項目の完全一致: ${exact}/${totalFields}  (${((exact / totalFields) * 100).toFixed(1)}%)`);
console.log(`  文字の正解率  : ${(((chars - errors) / chars) * 100).toFixed(1)}%  (誤り ${errors}/${chars} 文字)`);
process.exit(0);
