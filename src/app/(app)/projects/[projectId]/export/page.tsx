import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/app/page-header';
import { ExportPanel } from '@/components/photos/export-panel';
import { requireSession } from '@/lib/auth/session';
import { getProject, capabilitiesForProject } from '@/lib/queries/projects';
import { loadLedgerData } from '@/lib/export/ledger-source';
import { findNonCompliant } from '@/lib/export/denshi-nouhin';
import { formatShotAt } from '@/lib/utils';

export const metadata: Metadata = { title: '出力設定' };

export default async function ExportPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { user, organization } = await requireSession();

  const project = await getProject(organization.id, projectId);
  if (!project) notFound();

  const capabilities = await capabilitiesForProject(user.id, projectId);

  // 画像本体は読まない。適合チェックは登録情報だけで判定できる。
  const data = await loadLedgerData(organization.id, projectId);

  /*
   * 不適合の理由だけでは、現場でどの写真を直せばよいか分かりません。
   * 写真名と撮影日時を添えて、特定できる形で渡します。
   */
  const byId = new Map((data?.photos ?? []).map((p) => [p.id, p]));
  const nonCompliant = (data ? findNonCompliant(data.photos) : []).map((problem) => {
    const photo = byId.get(problem.id);
    return {
      ...problem,
      label: photo?.title || photo?.originalFilename || '無題の写真',
      takenAt: photo?.takenAt ? formatShotAt(photo.takenAt) : null,
    };
  });

  return (
    <>
      <PageHeader title={`${project.name}　出力設定`} />
      <ExportPanel
        projectId={projectId}
        totalPhotos={data?.photos.length ?? 0}
        nonCompliant={nonCompliant}
        isPublicWorks={project.contractType === 'public'}
        canExportExcel={capabilities.has('export.excel')}
        canExportPdf={capabilities.has('export.pdf')}
        canExportNouhin={capabilities.has('export.denshi_nouhin')}
      />
    </>
  );
}
