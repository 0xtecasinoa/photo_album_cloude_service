import type { LedgerData, LedgerPhoto, PhotosPerPage } from './types';
import { formatJstDate } from './excel';

/**
 * 写真台帳の PDF 出力。
 *
 * HTML を組み立ててから Chromium の印刷機能で PDF 化します。pdf-lib に
 * 日本語フォントを埋め込む方式より、禁則処理・字詰め・改ページが正しく、
 * 画面の体裁をそのまま紙に落とせるためです。
 *
 * HTML 生成（buildLedgerHtml）は純粋関数なのでテストできます。
 * Chromium 呼び出し（renderPdf）は差し替え可能な薄い層に留めています。
 */

const ESCAPE: Record<string, string> = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
};

export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPE[c]!);
}

export type PdfExportOptions = {
  photosPerPage?: PhotosPerPage;
  /** 画像を埋め込むための data URI 解決。省略時は枠のみ描画します。 */
  resolveImage?: (photo: LedgerPhoto) => string | null;
};

/** 1ページあたりの写真枚数に対する段組み。 */
const GRID: Record<PhotosPerPage, { cols: number; rows: number }> = {
  1: { cols: 1, rows: 1 },
  3: { cols: 1, rows: 3 },
  4: { cols: 2, rows: 2 },
  6: { cols: 2, rows: 3 },
};

export function chunk<T>(items: T[], size: number): T[][] {
  if (size < 1) throw new RangeError('size must be >= 1');
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function photoCell(photo: LedgerPhoto, options: PdfExportOptions): string {
  const src = options.resolveImage?.(photo) ?? null;
  const img = src
    ? `<img class="shot" src="${escapeHtml(src)}" alt="">`
    : '<div class="shot shot--empty"></div>';

  const rows: [string, string | null | undefined][] = [
    ['撮影年月日', formatJstDate(photo.takenAt)],
    ['写真区分', photo.category],
    ['工種', photo.workType],
    ['種別', photo.workKind],
    ['細別', photo.workDetail],
    ['撮影箇所', photo.shootingLocation],
    ['施工管理値', photo.controlValue],
  ];

  const meta = rows
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`)
    .join('');

  return `<figure class="cell">
  ${img}
  <figcaption>
    <p class="title">${escapeHtml(photo.title ?? '')}</p>
    <table class="meta">${meta}</table>
    ${photo.contractorNote ? `<p class="note">${escapeHtml(photo.contractorNote)}</p>` : ''}
  </figcaption>
</figure>`;
}

export function buildLedgerHtml(data: LedgerData, options: PdfExportOptions = {}): string {
  const perPage = options.photosPerPage ?? 4;
  const { cols, rows } = GRID[perPage];
  const pages = chunk(data.photos, perPage);
  const { project } = data;

  const body = pages
    .map(
      (pagePhotos, i) => `<section class="page">
  <header class="page-head">
    <h1>工事写真台帳</h1>
    <dl>
      <dt>工事名</dt><dd>${escapeHtml(project.name)}</dd>
      ${project.code ? `<dt>工事番号</dt><dd>${escapeHtml(project.code)}</dd>` : ''}
      ${project.contractorName ? `<dt>請負者</dt><dd>${escapeHtml(project.contractorName)}</dd>` : ''}
    </dl>
  </header>
  <div class="grid">${pagePhotos.map((p) => photoCell(p, options)).join('')}</div>
  <footer class="page-foot"><span>${i + 1} / ${pages.length}</span></footer>
</section>`,
    )
    .join('');

  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8">
<title>工事写真台帳 - ${escapeHtml(project.name)}</title>
<style>
  @page { size: A4 portrait; margin: 12mm 10mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Noto Sans JP", "Yu Gothic", "Hiragino Kaku Gothic ProN", sans-serif;
         color: #1e1e1e; font-size: 9pt; line-height: 1.6; }
  .page { page-break-after: always; display: flex; flex-direction: column; min-height: 265mm; }
  .page:last-child { page-break-after: auto; }
  .page-head { border-bottom: 2px solid #1e3a8b; padding-bottom: 4mm; margin-bottom: 5mm; }
  .page-head h1 { margin: 0 0 2mm; font-size: 13pt; color: #1e3a8b; }
  .page-head dl { display: grid; grid-template-columns: auto 1fr auto 1fr; gap: 1mm 3mm; margin: 0; font-size: 8.5pt; }
  .page-head dt { font-weight: 700; color: #475569; }
  .page-head dd { margin: 0; }
  .grid { flex: 1; display: grid; gap: 5mm;
          grid-template-columns: repeat(${cols}, 1fr); grid-template-rows: repeat(${rows}, 1fr); }
  .cell { margin: 0; display: flex; flex-direction: column; border: 1px solid #cbd5e1; padding: 3mm; }
  .shot { width: 100%; flex: 1; object-fit: contain; background: #f1f5f9; min-height: 0; }
  .shot--empty { border: 1px dashed #cbd5e1; }
  figcaption { margin-top: 2.5mm; }
  .title { margin: 0 0 1.5mm; font-weight: 700; font-size: 9.5pt; }
  .meta { width: 100%; border-collapse: collapse; font-size: 8pt; }
  .meta th { width: 22mm; text-align: left; font-weight: 500; color: #475569;
             border-bottom: 1px solid #e2e8f0; padding: 0.6mm 0; vertical-align: top; }
  .meta td { border-bottom: 1px solid #e2e8f0; padding: 0.6mm 0; }
  .note { margin: 1.5mm 0 0; font-size: 8pt; color: #334155; }
  .page-foot { margin-top: 4mm; text-align: right; font-size: 8pt; color: #94a3b8; }
</style></head>
<body>${body}</body></html>`;
}

/**
 * HTML を PDF に変換する。
 * Chromium を使うため、実行環境に Chrome/Chromium が必要です。
 */
export async function renderPdf(html: string, executablePath?: string): Promise<Buffer> {
  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({
    executablePath: executablePath ?? process.env.CHROME_PATH ?? '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    return await page.pdf({ format: 'A4', printBackground: true });
  } finally {
    await browser.close();
  }
}

export async function exportLedgerPdf(
  data: LedgerData,
  options: PdfExportOptions = {},
): Promise<Buffer> {
  return renderPdf(buildLedgerHtml(data, options));
}
