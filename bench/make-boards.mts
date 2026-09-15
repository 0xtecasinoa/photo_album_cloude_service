/**
 * 精度測定用の看板見本を作る。
 *
 * 実際の現場写真は、正対して撮られていることのほうが少ないため、
 * 傾き・影・低解像度・書体違いを混ぜています。ここで作った画像と
 * 「正解」を突き合わせて、認識率を測ります。
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp, { type Sharp } from 'sharp';

export type BoardCase = {
  name: string;
  /** 正解。フィールドキー → 値。 */
  truth: Record<string, string>;
  file: string;
};

const OUT = path.join(process.cwd(), 'bench', 'boards');

const ROWS = [
  ['工事名', '国道357号線 舗装改修工事'],
  ['工種', '路盤工'],
  ['測点', 'NO.12+5.0m'],
  ['施工者', '大和建設工業'],
  ['日付', '2026/04/28'],
];

const TRUTH: Record<string, string> = {
  projectName: '国道357号線 舗装改修工事',
  workType: '路盤工',
  shootingLocation: 'NO.12+5.0m',
  contractor: '大和建設工業',
  date: '2026/04/28',
};

function boardSvg(opts: {
  font: string;
  bg: string;
  fg: string;
  fontSize: number;
  rules: boolean;
}): string {
  const W = 1400;
  const H = 900;
  const rowH = (H - 48) / ROWS.length;
  const lines = opts.rules
    ? ROWS.map((_, i) => `<line x1="24" y1="${24 + rowH * (i + 1)}" x2="${W - 24}" y2="${24 + rowH * (i + 1)}" stroke="${opts.fg}" stroke-width="4"/>`).join('')
      + `<line x1="400" y1="24" x2="400" y2="${H - 24}" stroke="${opts.fg}" stroke-width="4"/>`
      + `<rect x="24" y="24" width="${W - 48}" height="${H - 48}" fill="none" stroke="${opts.fg}" stroke-width="8"/>`
    : '';

  const text = ROWS.map(([label, value], i) => {
    const y = 24 + rowH * i + rowH / 2 + opts.fontSize / 3;
    return `<text x="70" y="${y}" font-size="${opts.fontSize}" fill="${opts.fg}">${label}</text>`
      + `<text x="440" y="${y}" font-size="${opts.fontSize}" fill="${opts.fg}">${value}</text>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="${opts.bg}"/>
    ${lines}
    <g font-family="${opts.font}" font-weight="500">${text}</g>
  </svg>`;
}

async function write(name: string, svg: string, transform?: (p: Sharp) => Sharp) {
  let pipe = sharp(Buffer.from(svg));
  if (transform) pipe = transform(pipe);
  const file = path.join(OUT, `${name}.jpg`);
  await pipe.jpeg({ quality: 88 }).toFile(file);
  return file;
}

export async function makeBoards(): Promise<BoardCase[]> {
  mkdirSync(OUT, { recursive: true });
  const cases: BoardCase[] = [];

  // 1. 正対・くっきり（一番やさしい）
  cases.push({
    name: '01-正対',
    truth: TRUTH,
    file: await write('01-plain', boardSvg({ font: 'Noto Sans CJK JP', bg: '#f4f1e8', fg: '#1a1a1a', fontSize: 56, rules: true })),
  });

  // 2. 明朝体（書体違い）
  cases.push({
    name: '02-明朝体',
    truth: TRUTH,
    file: await write('02-serif', boardSvg({ font: 'Noto Serif CJK JP', bg: '#ffffff', fg: '#111111', fontSize: 56, rules: true })),
  });

  // 3. 緑の黒板（チョーク想定・白文字）
  cases.push({
    name: '03-緑板',
    truth: TRUTH,
    file: await write('03-green', boardSvg({ font: 'Noto Sans CJK JP', bg: '#1b5e20', fg: '#f5f5f5', fontSize: 56, rules: true })),
  });

  // 4. 斜めから撮影（現場では正対しないことが多い）
  cases.push({
    name: '04-傾き6度',
    truth: TRUTH,
    file: await write('04-skew', boardSvg({ font: 'Noto Sans CJK JP', bg: '#f4f1e8', fg: '#1a1a1a', fontSize: 56, rules: true }),
      (p) => p.rotate(6, { background: '#8a8a8a' })),
  });

  // 5. 低解像度（遠くから撮った・古い端末）
  cases.push({
    name: '05-低解像度',
    truth: TRUTH,
    file: await write('05-small', boardSvg({ font: 'Noto Sans CJK JP', bg: '#f4f1e8', fg: '#1a1a1a', fontSize: 56, rules: true }),
      (p) => p.resize({ width: 640 })),
  });

  // 6. 影・低コントラスト（屋外の逆光）
  cases.push({
    name: '06-低コントラスト',
    truth: TRUTH,
    file: await write('06-lowcontrast', boardSvg({ font: 'Noto Sans CJK JP', bg: '#b9b2a2', fg: '#4a4a44', fontSize: 56, rules: true }),
      (p) => p.modulate({ brightness: 0.85 }).blur(0.8)),
  });

  // 7. 罫線なし（書き込み式の簡易板）
  cases.push({
    name: '07-罫線なし',
    truth: TRUTH,
    file: await write('07-norules', boardSvg({ font: 'Noto Sans CJK JP', bg: '#ffffff', fg: '#1a1a1a', fontSize: 56, rules: false })),
  });

  // 8. 黒板・傾き・低解像度の重ね合わせ（現場で一番つらい条件）
  cases.push({
    name: '08-黒板+傾き+低解像度',
    truth: TRUTH,
    file: await write('08-worst', boardSvg({ font: 'Noto Sans CJK JP', bg: '#132a22', fg: '#f0f0f0', fontSize: 56, rules: true }),
      (p) => p.rotate(-4, { background: '#222222' }).resize({ width: 900 }).blur(0.6)),
  });

  // 9. JPEG を強く圧縮（通信量を抑える端末設定）
  cases.push({
    name: '09-強圧縮',
    truth: TRUTH,
    file: await write('09-jpeg', boardSvg({ font: 'Noto Sans CJK JP', bg: '#f4f1e8', fg: '#1a1a1a', fontSize: 56, rules: true }),
      (p) => p.resize({ width: 1000 }).jpeg({ quality: 30 })),
  });

  // 10. 別の記載内容（見本に合わせ込んでいないかの確認）
  const alt = {
    projectName: '市道1号橋 補修工事',
    workType: '橋梁補修工',
    shootingLocation: 'NO.3+12.5m',
    contractor: '山田組',
    date: '2025/11/06',
  };
  const altRows = [
    ['工事名', alt.projectName],
    ['工種', alt.workType],
    ['測点', alt.shootingLocation],
    ['施工者', alt.contractor],
    ['日付', alt.date],
  ];
  const saved = ROWS.splice(0, ROWS.length, ...altRows);
  cases.push({
    name: '10-別内容',
    truth: alt,
    file: await write('10-alt', boardSvg({ font: 'Noto Sans CJK JP', bg: '#1b5e20', fg: '#ffffff', fontSize: 56, rules: true })),
  });
  ROWS.splice(0, ROWS.length, ...saved);

  return cases;
}

if (process.argv[1]?.endsWith('make-boards.mts')) {
  const cases = await makeBoards();
  writeFileSync(path.join(OUT, 'cases.json'), JSON.stringify(cases, null, 2));
  console.log(`${cases.length} 枚作成: ${OUT}`);
}
