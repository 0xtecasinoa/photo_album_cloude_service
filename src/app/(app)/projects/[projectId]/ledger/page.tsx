import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { FileOutput } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { buttonVariants } from '@/components/ui/button';
import { LedgerLayoutPicker } from '@/components/photos/ledger-layout-picker';
import { requireSession } from '@/lib/auth/session';
import { getProject, capabilitiesForProject } from '@/lib/queries/projects';
import { loadLedgerPreview } from '@/lib/export/ledger-source';

export const metadata: Metadata = { title: '写真台帳' };

export default async function LedgerPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { user, organization } = await requireSession();

  const project = await getProject(organization.id, projectId);
  if (!project) notFound();

  const capabilities = await capabilitiesForProject(user.id, projectId);
  const preview = await loadLedgerPreview(organization.id, projectId);

  return (
    <>
      <PageHeader
        title={`${project.name} 写真台帳`}
        actions={
          capabilities.has('export.pdf') || capabilities.has('export.excel') ? (
            <Link
              href={`/projects/${projectId}/export`}
              className={buttonVariants({ variant: 'primary', size: 'lg' })}
            >
              <FileOutput className="size-4" aria-hidden />
              EXCEL / PDF 出力手続きへ
            </Link>
          ) : null
        }
      />
      <LedgerLayoutPicker photos={preview?.photos ?? []} />
    </>
  );
}
