import type { Metadata } from 'next';
import { RefreshCw, Upload, CircleAlert, FileDown } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Button } from '@/components/ui/button';
import { demoPhotos } from '@/lib/demo-data';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: '電子納品出力設定' };

const FORMATS = [
  {
    key: 'pdf',
    name: 'PDF 形式（提出・印刷用）',
    description: '国土交通省・自治体提出用の高機能A4ファイル',
    accent: '#D93025',
    glyph: 'PDF',
    selected: true,
  },
  {
    key: 'xlsx',
    name: 'EXCEL 形式（.XLSX）',
    description: '発注者指定フォームの流用・再編集可能な帳票',
    accent: '#1D6F42',
    glyph: 'X',
    selected: false,
  },
  {
    key: 'docx',
    name: 'WORD 形式（.DOCX）',
    description: '説明文書メインの報告書作成向け',
    accent: '#2B579A',
    glyph: 'W',
    selected: false,
  },
];

export default function DenshiNouhinPage() {
  // Photos whose JACIC signature cannot be verified may not be delivered.
  const nonCompliant = demoPhotos.filter((p) => p.integrityValid === false);
  const blocked = nonCompliant.length > 0;

  return (
    <>
      <PageHeader
        title="電子納品出力設定"
        actions={
          <>
            <Button variant="outline" size="lg">
              <RefreshCw className="size-4" aria-hidden />
              モード切替
            </Button>
            <Button variant="primary" size="lg">
              <Upload className="size-4" aria-hidden />
              電子納品出力設定
            </Button>
          </>
        }
      />

      <div className="px-8 pt-8 xl:px-[31px]">
        {/* Mode banner */}
        <div className="bg-success-tint/55 flex flex-wrap items-center justify-between gap-5 rounded-[10px] px-8 py-7">
          <div>
            <p className="text-success text-[15px] font-bold">
              電子納品モード設定：ON（適合チェック適用）
            </p>
            <p className="mt-3 text-[14px] text-ink">
              公共工事の提出用台帳としてデジタル署名・改ざんの有無を自動チェックします。
            </p>
          </div>
          <Button variant="outline" size="lg" className="shrink-0">
            モード切替（社内用OFFへ）
          </Button>
        </div>

        {/* Compliance gate */}
        {blocked && (
          <div
            role="alert"
            className="border-danger/45 bg-danger-tint/45 mt-6 rounded-[10px] border px-8 py-7"
          >
            <p className="text-danger flex items-center gap-2.5 text-[15px] font-bold">
              <CircleAlert className="size-5 shrink-0" aria-hidden />
              電子納品不適合写真が含まれるため出力が制限されています（{nonCompliant.length}枚）
            </p>
            <p className="mt-4 text-[14px] leading-[1.9] text-ink">
              電子納品モードON時は、デジタル署名が検証できない写真（外部加工写真や署名なし
              レポート写真）が混ざっている場合、出力が自動ストップします。
            </p>

            <ul className="border-danger/45 mt-5 space-y-2 rounded-[8px] border bg-white px-5 py-4">
              {nonCompliant.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-4 text-[13px]">
                  <span className="text-ink">
                    ・出所不明インポート写真（警告マーク表示部分）（仮設工（足場組立））／ 署名なし
                  </span>
                  <span className="text-danger shrink-0 font-bold">要除外</span>
                </li>
              ))}
            </ul>

            <p className="text-danger mt-5 text-[14px] font-bold">
              対象：対象の写真を除外するか、社内用モードOFFに切り替えて出力してください。
            </p>
          </div>
        )}

        {/* Format picker */}
        <section className="mt-12">
          <h2 className="text-brand text-[17px] font-bold">1: 出力形式とページ体裁の選択</h2>

          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            {FORMATS.map((f) => (
              <div
                key={f.key}
                className={cn(
                  'relative rounded-[10px] border px-7 py-8',
                  f.selected ? 'border-brand bg-brand-tint/70' : 'border-border-subtle bg-white',
                )}
              >
                {f.selected && (
                  <span className="bg-brand absolute top-5 right-5 grid size-[22px] place-items-center rounded-[4px] text-white">
                    <svg viewBox="0 0 14 14" className="size-3.5" aria-hidden>
                      <path
                        d="M2 7.5 5.5 11 12 3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="sr-only">選択中</span>
                  </span>
                )}

                <div
                  className="grid size-[62px] place-items-center rounded-[10px] text-[19px] font-bold text-white"
                  style={{ backgroundColor: f.accent }}
                  aria-hidden
                >
                  {f.glyph}
                </div>

                <h3 className="mt-6 text-[15px] font-bold text-ink">{f.name}</h3>
                <p className="text-ink-muted mt-3 text-[13px] leading-[1.8]">{f.description}</p>

                <Button variant="outline" size="md" className="mt-6">
                  詳細を確認 ▶︎
                </Button>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-5 pb-16">
          <p className="text-brand text-[17px] font-bold">
            出力対象：全 {demoPhotos.length - nonCompliant.length} 枚の写真台帳
          </p>
          <Button variant="primary" size="lg" disabled={blocked}>
            <FileDown className="size-4" aria-hidden />
            PDF で台帳を出力ダウンロード
          </Button>
        </div>
      </div>
    </>
  );
}
