'use client';

import { useState } from 'react';
import { RefreshCw, CircleAlert, FileDown, Loader2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Format = 'pdf' | 'excel' | 'word' | 'nouhin';

type FormatDef = {
  key: Format;
  name: string;
  description: string;
  accent: string;
  glyph: string;
  /** 「詳細を確認」で開く説明。どれを選べばよいか迷わせないためのもの。 */
  detail: string[];
};

const FORMATS: FormatDef[] = [
  {
    key: 'pdf',
    name: 'PDF 形式（提出・印刷用）',
    description: '国土交通省・自治体提出用の高機能A4ファイル',
    accent: '#D93025',
    glyph: 'PDF',
    detail: [
      '1ページあたり 1 / 3 / 4 / 6 枚から体裁を選べます。',
      '写真・撮影年月日・工種・撮影箇所・請負者説明文を1枚ずつ並べます。',
      'そのまま印刷して提出できます。受け取った側では編集できません。',
    ],
  },
  {
    key: 'excel',
    name: 'EXCEL 形式（.XLSX）',
    description: '発注者指定フォームの流用・再編集可能な帳票',
    accent: '#1D6F42',
    glyph: 'X',
    detail: [
      '写真を貼り込んだ一覧表として出力します。',
      '発注者指定の雛形がある場合は、{{工事名}} 形式の差し込みにも対応します。',
      '受け取った側で並べ替えや列の追加ができます。',
    ],
  },
  {
    key: 'word',
    name: 'WORD 形式（.DOCX）',
    description: '説明文書メインの報告書作成向け',
    accent: '#2B579A',
    glyph: 'W',
    detail: [
      '写真の下に管理項目の表と説明文を置いた、文書としての体裁で出力します。',
      '先方が文章を書き足す前提の報告書に向いています。',
      '指定枚数ごとに改ページします。',
    ],
  },
  {
    key: 'nouhin',
    name: '電子納品（CALS/EC ZIP）',
    description: 'PHOTO.XML・PIC/DRA 構成での成果品出力',
    accent: '#1E3A8B',
    glyph: 'ZIP',
    detail: [
      'デジタル写真管理情報基準（令和5年3月）に沿った ZIP を作ります。',
      'PHOTO/PHOTO.XML は Shift_JIS、写真は PHOTO/PIC に P0000001.JPG 形式で入ります。',
      '原本をそのまま収めます。署名が検証できない写真があると出力を止めます。',
    ],
  },
];

export function ExportPanel({
  projectId,
  totalPhotos,
  nonCompliant,
  isPublicWorks,
  canExportExcel,
  canExportPdf,
  canExportNouhin,
}: {
  projectId: string;
  totalPhotos: number;
  nonCompliant: { id: string; reason: string; label: string; takenAt: string | null }[];
  isPublicWorks: boolean;
  canExportExcel: boolean;
  canExportPdf: boolean;
  canExportNouhin: boolean;
}) {
  const allowed = FORMATS.filter((f) => {
    if (f.key === 'excel') return canExportExcel;
    if (f.key === 'nouhin') return canExportNouhin;
    // Word は PDF と同じ「提出物の体裁を作る」権限で扱う。
    return canExportPdf;
  });
  const [format, setFormat] = useState<Format>(allowed[0]?.key ?? 'pdf');
  const [perPage, setPerPage] = useState(4);
  // 民間工事では適合チェックの対象外なので、既定を OFF にしておく。
  const [strictMode, setStrictMode] = useState(isPublicWorks);
  const [openDetail, setOpenDetail] = useState<Format | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 電子納品モードのときだけ、不適合写真が出力を止める。
  const blocked = strictMode && format === 'nouhin' && nonCompliant.length > 0;
  const remaining = totalPhotos - nonCompliant.length;

  async function download(options: { excludeNonCompliant?: boolean } = {}) {
    setBusy(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ perPage: String(perPage) });
      if (!strictMode) qs.set('mode', 'internal');
      if (options.excludeNonCompliant) {
        qs.set('exclude', nonCompliant.map((p) => p.id).join(','));
      }
      const res = await fetch(`/api/projects/${projectId}/export/${format}?${qs}`);

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setError(payload.error ?? `出力に失敗しました（${res.status}）`);
        return;
      }

      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const match = /filename\*=UTF-8''([^;]+)/.exec(disposition);
      const filename = match ? decodeURIComponent(match[1]!) : `台帳.${format}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('通信に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setBusy(false);
    }
  }

  if (allowed.length === 0) {
    return (
      <div className="px-8 pt-8 xl:px-[31px]">
        <p className="text-ink-muted rounded-[10px] bg-surface-sunken px-6 py-8 text-[13px]">
          出力する権限がありません。管理者にお問い合わせください。
        </p>
      </div>
    );
  }

  return (
    <div className="px-8 pt-8 xl:px-[31px]">
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-5 rounded-[10px] px-8 py-7',
          strictMode ? 'bg-success-tint/55' : 'bg-surface-sunken',
        )}
      >
        <div>
          <p className={cn('text-[15px] font-bold', strictMode ? 'text-success' : 'text-ink-muted')}>
            電子納品モード設定：{strictMode ? 'ON（適合チェック適用）' : 'OFF（社内用）'}
          </p>
          <p className="mt-3 text-[14px] text-ink">
            {strictMode
              ? '公共工事の提出用台帳としてデジタル署名・改ざんの有無を自動チェックします。'
              : '社内確認用の出力です。提出物には使用しないでください。'}
          </p>
        </div>
        <Button variant="outline" size="lg" className="shrink-0" onClick={() => setStrictMode((v) => !v)}>
          <RefreshCw className="size-4" aria-hidden />
          モード切替（{strictMode ? '社内用OFFへ' : '提出用ONへ'}）
        </Button>
      </div>

      {blocked && (
        <div role="alert" className="border-danger/45 bg-danger-tint/45 mt-6 rounded-[10px] border px-8 py-7">
          <p className="text-danger flex items-center gap-2.5 text-[15px] font-bold">
            <CircleAlert className="size-5 shrink-0" aria-hidden />
            電子納品不適合写真が含まれるため出力が制限されています（{nonCompliant.length}枚）
          </p>
          <p className="mt-4 text-[14px] leading-[1.9] text-ink">
            電子納品モードON時は、デジタル署名が検証できない写真（外部加工写真や署名なしレポート写真）が混ざっている場合、出力が自動ストップします。
          </p>
          <ul className="border-danger/45 divide-danger/20 mt-5 divide-y rounded-[8px] border bg-white px-5">
            {nonCompliant.map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-4 py-3 text-[13px]">
                <span className="min-w-0">
                  <span className="block truncate font-bold text-ink">{p.label}</span>
                  <span className="text-ink-muted block text-[12px]">
                    {p.takenAt ? `${p.takenAt}　/　` : ''}{p.reason}
                  </span>
                </span>
                <span className="text-danger shrink-0 font-bold">要除外</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <Button
              variant="primary"
              size="lg"
              disabled={busy || remaining === 0}
              onClick={() => download({ excludeNonCompliant: true })}
            >
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <FileDown className="size-4" aria-hidden />}
              {nonCompliant.length} 枚を除外して出力（残り {remaining} 枚）
            </Button>
            <p className="text-ink text-[13px]">
              {remaining === 0
                ? '適合する写真がないため、除外しての出力はできません。'
                : '除外した写真は成果品に含まれません。社内用モードOFFなら全枚数を出力できます。'}
            </p>
          </div>
        </div>
      )}

      <section className="mt-12">
        <h2 className="text-brand text-[17px] font-bold">1: 出力形式とページ体裁の選択</h2>

        <div
          className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-4"
          role="radiogroup"
          aria-label="出力形式"
        >
          {allowed.map((f) => (
            <div
              key={f.key}
              className={cn(
                'relative flex flex-col rounded-[10px] border transition-colors',
                format === f.key
                  ? 'border-brand bg-brand-tint/70'
                  : 'border-border-subtle bg-white hover:border-brand/40',
              )}
            >
              <button
                type="button"
                role="radio"
                aria-checked={format === f.key}
                onClick={() => setFormat(f.key)}
                className="flex-1 px-7 pt-8 pb-5 text-left"
              >
                {format === f.key && (
                  <span className="bg-brand absolute top-5 right-5 grid size-[22px] place-items-center rounded-[4px] text-white">
                    <svg viewBox="0 0 14 14" className="size-3.5" aria-hidden>
                      <path d="M2 7.5 5.5 11 12 3.5" fill="none" stroke="currentColor" strokeWidth="2.2"
                        strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                )}
                <span className="grid size-[62px] place-items-center rounded-[10px] text-[17px] font-bold text-white"
                      style={{ backgroundColor: f.accent }} aria-hidden>
                  {f.glyph}
                </span>
                <span className="mt-6 block text-[15px] font-bold text-ink">{f.name}</span>
                <span className="text-ink-muted mt-3 block text-[13px] leading-[1.8]">{f.description}</span>
              </button>

              <div className="border-border-subtle border-t px-7 py-3">
                <button
                  type="button"
                  onClick={() => setOpenDetail(openDetail === f.key ? null : f.key)}
                  aria-expanded={openDetail === f.key}
                  className="text-brand-link flex w-full items-center justify-between text-[12px] font-bold"
                >
                  詳細を確認
                  <ChevronRight
                    className={cn('size-4 transition-transform', openDetail === f.key && 'rotate-90')}
                    aria-hidden
                  />
                </button>
                {openDetail === f.key && (
                  <ul className="text-ink-muted mt-3 space-y-2 text-[12px] leading-[1.8]">
                    {f.detail.map((d) => (
                      <li key={d} className="flex gap-2">
                        <span aria-hidden>・</span>
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {format !== 'nouhin' && (
        <section className="mt-10">
          <h2 className="text-brand text-[17px] font-bold">2: 1ページ配置枚数</h2>
          <div role="radiogroup" aria-label="1ページ配置枚数" className="mt-4 flex gap-3">
            {[1, 3, 4, 6].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={perPage === n}
                onClick={() => setPerPage(n)}
                className={cn(
                  'h-[38px] w-[56px] rounded-[6px] border text-[13px] transition-colors',
                  perPage === n ? 'border-brand bg-brand text-white' : 'border-brand/35 text-brand bg-white hover:bg-brand-tint',
                )}
              >
                {n}枚
              </button>
            ))}
          </div>
        </section>
      )}

      {error && (
        <p role="alert" className="border-danger/40 bg-danger-tint text-danger mt-8 rounded-[8px] border px-5 py-4 text-[13px]">
          {error}
        </p>
      )}

      <div className="mt-10 flex flex-wrap items-center justify-between gap-5 pb-16">
        <p className="text-brand text-[17px] font-bold">
          出力対象：全 {totalPhotos} 枚の写真台帳
          {blocked && (
            <span className="text-danger ml-3 text-[14px]">
              （うち {nonCompliant.length} 枚が電子納品不適合）
            </span>
          )}
        </p>
        <Button variant="primary" size="lg" disabled={blocked || busy} onClick={() => download()}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <FileDown className="size-4" aria-hidden />}
          {busy ? '出力中…' : `${FORMATS.find((f) => f.key === format)?.glyph ?? ''} で台帳を出力ダウンロード`}
        </Button>
      </div>
    </div>
  );
}
