import type { Metadata } from 'next';
import Link from 'next/link';
import { FolderOpen, Camera, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Badge } from '@/components/ui/badge';
import { NewProjectDialog } from '@/components/projects/new-project-dialog';
import { requireSession } from '@/lib/auth/session';
import { listProjects } from '@/lib/queries/projects';
import { formatDateOnly } from '@/lib/utils';

export const metadata: Metadata = { title: '工事写真台帳' };

const STATUS_LABELS: Record<string, string> = {
  planning: '準備中',
  active: '施工中',
  suspended: '中断',
  completed: '完成',
  archived: '保管',
};

export default async function ProjectsPage() {
  const { organization, capabilities } = await requireSession();
  const projects = await listProjects(organization.id);

  return (
    <>
      <PageHeader
        title="工事写真台帳"
        actions={<NewProjectDialog canCreate={capabilities.has('project.create')} />}
      />

      <div className="px-8 pt-8 xl:px-[31px]">
        {projects.length === 0 ? (
          <div className="border-border-subtle grid place-items-center rounded-[14px] border border-dashed bg-white px-6 py-20 text-center">
            <FolderOpen className="text-brand/30 size-12" strokeWidth={1.2} aria-hidden />
            <h2 className="mt-5 text-[17px] font-bold text-ink">現場がまだありません</h2>
            <p className="text-ink-muted mt-3 max-w-[420px] text-[13px] leading-[1.9]">
              「現場を追加」から工事を登録すると、写真の取り込みと台帳の作成ができるようになります。
            </p>
            <div className="mt-7">
              <NewProjectDialog canCreate={capabilities.has('project.create')} />
            </div>
          </div>
        ) : (
          <>
            <p className="text-ink-muted mb-5 text-[13px]">
              全 {projects.length} 件
            </p>
            <ul className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
              {projects.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/projects/${p.id}`}
                    className="border-border-subtle hover:border-brand group block h-full rounded-[14px] border bg-white p-6 transition-colors"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <Badge variant={p.contractType === 'public' ? 'admin' : 'neutral'}>
                        {p.contractType === 'public' ? '公共工事' : '民間工事'}
                      </Badge>
                      <Badge variant={p.status === 'active' ? 'success' : 'neutral'}>
                        {STATUS_LABELS[p.status] ?? p.status}
                      </Badge>
                    </div>

                    <h2 className="text-brand group-hover:text-brand-link mt-4 text-[17px] leading-[1.6] font-bold">
                      {p.name}
                    </h2>

                    <dl className="text-ink-muted mt-3 space-y-1 text-[12px]">
                      {p.code && (
                        <div className="flex gap-1">
                          <dt>工事番号：</dt>
                          <dd className="tabular">{p.code}</dd>
                        </div>
                      )}
                      {p.clientName && (
                        <div className="flex gap-1">
                          <dt className="shrink-0">発注者：</dt>
                          <dd className="truncate">{p.clientName}</dd>
                        </div>
                      )}
                    </dl>

                    <div className="border-border-subtle mt-5 flex items-center justify-between border-t pt-4">
                      <span className="text-ink-muted flex items-center gap-1.5 text-[12px]">
                        <Camera className="size-4" strokeWidth={1.7} aria-hidden />
                        <span className="tabular">{p.photoCount.toLocaleString('ja-JP')}</span> 枚
                      </span>
                      <span className="text-brand-link flex items-center gap-1 text-[12px]">
                        {p.lastShotAt ? `最終撮影 ${formatDateOnly(p.lastShotAt)}` : '写真なし'}
                        <ArrowRight className="size-3.5" aria-hidden />
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}
