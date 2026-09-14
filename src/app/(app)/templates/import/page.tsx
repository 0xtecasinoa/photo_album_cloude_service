import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ScanLine, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { BoardImportUploader } from '@/components/blackboard/board-import-uploader';
import { requireSession } from '@/lib/auth/session';
import { listImports } from '@/lib/queries/blackboard-imports';
import { isOcrAvailable } from '@/lib/blackboard/ocr';
import { formatShotAt } from '@/lib/utils';

export const metadata: Metadata = { title: '手書き看板の取り込み' };

const STATUS_LABELS: Record<string, string> = {
  pending: '待機中',
  processing: '読み取り中',
  needs_review: '確認待ち',
  confirmed: '取り込み済み',
  failed: '失敗',
};

export default async function BoardImportPage() {
  const { organization, capabilities } = await requireSession();

  const canManage = capabilities.has('blackboard.template.manage');
  const imports = canManage ? await listImports(organization.id) : [];
  const ocrReady = isOcrAvailable();

  return (
    <>
      <PageHeader
        title="手書き看板の取り込み"
        actions={
          <Link href="/templates" className="text-brand-link flex items-center gap-1.5 text-[13px] hover:underline">
            <ArrowLeft className="size-4" aria-hidden />
            テンプレート設計へ戻る
          </Link>
        }
      />

      <div className="px-8 pt-8 pb-16 xl:px-[31px]">
        <div className="mx-auto max-w-[900px]">
          {!canManage ? (
            <p className="border-border-subtle text-ink-muted rounded-[10px] border bg-white px-6 py-10 text-center text-[13px]">
              看板を取り込む権限がありません。
            </p>
          ) : (
            <>
              <div className="border-border-subtle rounded-[10px] border bg-white px-7 py-6">
                <h2 className="text-brand flex items-center gap-2.5 text-[17px] font-bold">
                  <ScanLine className="size-5" strokeWidth={1.8} aria-hidden />
                  現場で使っている看板の写真から作る
                </h2>
                <p className="text-ink-muted mt-3 text-[13px] leading-7">
                  手書きの工事看板を正面から撮った写真をアップロードすると、項目名と記入内容を読み取って
                  電子小黒板テンプレートの下書きにします。
                  読み取り結果はそのまま使わず、必ず確認画面で内容を直してから保存してください。
                </p>

                {!ocrReady && (
                  <p className="border-accent/40 bg-accent/10 text-ink mt-5 flex items-start gap-2.5 rounded-[8px] border px-4 py-3 text-[12px]">
                    <AlertTriangle className="text-accent mt-0.5 size-4 shrink-0" aria-hidden />
                    <span>
                      文字認識の言語データが未設置です（<code className="tabular">npm run setup:ocr</code>）。
                      このままでも取り込めますが、項目は空欄で作成されるため手入力になります。
                    </span>
                  </p>
                )}

                <BoardImportUploader />
              </div>

              {imports.length > 0 && (
                <section className="mt-10">
                  <h2 className="text-brand text-[17px] font-bold">最近の取り込み</h2>
                  <ul className="border-border-subtle divide-border-subtle mt-4 divide-y overflow-hidden rounded-[10px] border bg-white">
                    {imports.map((row) => (
                      <li key={row.id} className="flex flex-wrap items-center gap-3 px-6 py-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-bold text-ink">
                            {STATUS_LABELS[row.status] ?? row.status}
                            {row.draftLayout && `　/　${row.draftLayout.fields.length} 項目`}
                          </p>
                          <p className="text-ink-muted mt-1 text-[12px]">
                            {formatShotAt(row.createdAt)}
                            {row.errorMessage && `　/　${row.errorMessage}`}
                          </p>
                        </div>
                        {row.status !== 'confirmed' && (
                          <Link
                            href={`/templates/import/${row.id}`}
                            className="text-brand-link shrink-0 text-[13px] font-bold hover:underline"
                          >
                            内容を確認する
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
