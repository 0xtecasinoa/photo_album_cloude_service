import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { FileOutput, FileSpreadsheet } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { buttonVariants } from '@/components/ui/button';
import { PhotoBrowser } from '@/components/photos/photo-browser';
import { UploadButton } from '@/components/photos/upload-button';
import { requireSession } from '@/lib/auth/session';
import { getProject, capabilitiesForProject } from '@/lib/queries/projects';
import { listPhotos, photoFacets } from '@/lib/queries/photos';
import { listShareLinks } from '@/lib/queries/share-links';
import { ShareDialog } from '@/components/share/share-dialog';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ projectId: string }>;
}): Promise<Metadata> {
  const { projectId } = await params;
  const { organization } = await requireSession();
  const project = await getProject(organization.id, projectId);
  return { title: project?.name ?? '工事写真台帳' };
}

export default async function ProjectPhotosPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { projectId } = await params;
  const sp = await searchParams;
  const { user, organization } = await requireSession();

  const project = await getProject(organization.id, projectId);
  if (!project) notFound();

  const capabilities = await capabilitiesForProject(user.id, projectId);

  const [photos, facets, shareLinks] = await Promise.all([
    listPhotos(projectId, {
      query: sp.q,
      workType: sp.workType,
      workKind: sp.workKind,
      workDetail: sp.workDetail,
      category: sp.category,
      integrityStatus: sp.integrity as never,
      uploadSource: sp.source as never,
      ocrStatus: sp.ocr as never,
      tag: sp.tag,
      sort: sp.sort as never,
      // 入力は日本時間の日付として扱う。UTC で解釈すると9時間ずれる。
      from: sp.from ? new Date(`${sp.from}T00:00:00+09:00`) : undefined,
      to: sp.to ? new Date(`${sp.to}T23:59:59+09:00`) : undefined,
    }),
    photoFacets(projectId),
    listShareLinks(organization.id, projectId),
  ]);

  return (
    <>
      <PageHeader
        title={project.name}
        actions={
          <>
            <UploadButton
              projectId={projectId}
              canUpload={capabilities.has('photo.upload')}
            />
            <ShareDialog
              projectId={projectId}
              links={shareLinks}
              canShare={capabilities.has('share.create')}
              canRevoke={capabilities.has('share.revoke')}
            />
            {capabilities.has('export.pdf') && (
              <Link
                href={`/projects/${projectId}/ledger`}
                className={buttonVariants({ variant: 'outline', size: 'lg' })}
              >
                <FileSpreadsheet className="size-4" aria-hidden />
                写真台帳
              </Link>
            )}
            {capabilities.has('export.denshi_nouhin') && (
              <Link
                href={`/projects/${projectId}/export`}
                className={buttonVariants({ variant: 'primary', size: 'lg' })}
              >
                <FileOutput className="size-4" aria-hidden />
                出力
              </Link>
            )}
          </>
        }
      />
      <PhotoBrowser
        projectId={projectId}
        photos={photos}
        facets={facets}
        canDelete={capabilities.has('photo.delete')}
      />
    </>
  );
}
