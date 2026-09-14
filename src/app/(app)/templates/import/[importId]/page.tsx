import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { ImportReview } from '@/components/blackboard/import-review';
import { requireSession } from '@/lib/auth/session';
import { getImport } from '@/lib/queries/blackboard-imports';
import { storage } from '@/lib/storage';

export const metadata: Metadata = { title: '看板の読み取り内容を確認' };

export default async function ImportReviewPage({
  params,
}: {
  params: Promise<{ importId: string }>;
}) {
  const { importId } = await params;
  const { organization, capabilities } = await requireSession();

  if (!capabilities.has('blackboard.template.manage')) notFound();

  const row = await getImport(organization.id, importId);
  if (!row || !row.draftLayout) notFound();

  const sourceUrl = await storage.readUrl(row.sourceStorageKey);

  return (
    <>
      <PageHeader
        title="読み取り内容の確認"
        actions={
          <Link href="/templates/import" className="text-brand-link flex items-center gap-1.5 text-[13px] hover:underline">
            <ArrowLeft className="size-4" aria-hidden />
            取り込み一覧へ
          </Link>
        }
      />
      <ImportReview
        importId={row.id}
        sourceUrl={sourceUrl}
        draftLayout={row.draftLayout}
        confidence={row.confidence ?? {}}
        errorMessage={row.errorMessage}
      />
    </>
  );
}
