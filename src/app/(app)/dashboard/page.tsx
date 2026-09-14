import type { Metadata } from 'next';
import Link from 'next/link';
import { Camera, ShieldCheck, FolderOpen, ArrowRight, HardHat } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Badge } from '@/components/ui/badge';
import { NewProjectDialog } from '@/components/projects/new-project-dialog';
import { requireSession } from '@/lib/auth/session';
import { listProjects, getOrganizationStats } from '@/lib/queries/projects';
import { formatDateOnly } from '@/lib/utils';

export const metadata: Metadata = { title: 'ダッシュボード' };

const STATUS_LABELS: Record<string, string> = {
  planning: '準備中', active: '施工中', suspended: '中断',
  completed: '完成', archived: '保管',
};

export default async function DashboardPage() {
  const { user, organization, capabilities } = await requireSession();
  const [projects, stats] = await Promise.all([
    listProjects(organization.id),
    getOrganizationStats(organization.id),
  ]);

  const recent = projects.slice(0, 6);

  const tiles = [
    { label: '進行中の現場', value: stats.activeProjects, unit: '件', icon: FolderOpen },
    { label: '登録写真', value: stats.totalPhotos, unit: '枚', icon: Camera },
    {
      label: '署名が未検証の写真',
      value: stats.unverified,
      unit: '枚',
      icon: ShieldCheck,
      alert: stats.unverified > 0,
    },
  ];

  return (
    <>
      <PageHeader
        title="ダッシュボード"
        actions={<NewProjectDialog canCreate={capabilities.has('project.create')} />}
      />

      <div className="px-8 pt-8 xl:px-[31px]">
        <p className="text-ink-muted mb-6 text-[13px]">
          {organization.name}　/　{user.name} さん
        </p>

        <div className="grid gap-5 sm:grid-cols-3">
          {tiles.map(({ label, value, unit, icon: Icon, alert }) => (
            <div key={label} className="border-border-subtle rounded-[10px] border bg-white px-6 py-5">
              <div className="flex items-center justify-between">
                <p className="text-ink-muted text-[13px]">{label}</p>
                <Icon className={alert ? 'text-danger size-[18px]' : 'text-brand-link size-[18px]'}
                  strokeWidth={1.7} aria-hidden />
              </div>
              <p className="mt-3 flex items-baseline gap-1.5">
                <span className={`tabular text-[30px] leading-none font-bold ${alert ? 'text-danger' : 'text-ink'}`}>
                  {value.toLocaleString('ja-JP')}
                </span>
                <span className="text-ink-muted text-[13px]">{unit}</span>
              </p>
            </div>
          ))}
        </div>

        {stats.unverified > 0 && (
          <p className="border-danger/40 bg-danger-tint text-danger mt-6 rounded-[10px] border px-6 py-4 text-[13px]">
            署名が検証できない写真が {stats.unverified} 枚あります。公共工事の電子納品では出力が止まります。
          </p>
        )}

        <section className="mt-12 pb-16">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-brand text-[17px] font-bold">現場</h2>
            <Link href="/projects" className="text-brand-link flex items-center gap-1 text-[13px] hover:underline">
              すべて見る
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="border-border-subtle grid place-items-center rounded-[14px] border border-dashed bg-white px-6 py-16 text-center">
              <HardHat className="text-brand/30 size-10" strokeWidth={1.3} aria-hidden />
              <h3 className="mt-4 text-[15px] font-bold text-ink">現場がまだありません</h3>
              <p className="text-ink-muted mt-2 text-[13px]">
                「現場を追加」から工事を登録してください。
              </p>
            </div>
          ) : (
            <ul className="border-border-subtle divide-border-subtle divide-y overflow-hidden rounded-[10px] border bg-white">
              {recent.map((p) => (
                <li key={p.id}>
                  <Link href={`/projects/${p.id}`} className="hover:bg-surface-muted flex items-center gap-4 px-6 py-4 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-[14px] font-bold text-ink">{p.name}</p>
                        <Badge variant={p.contractType === 'public' ? 'admin' : 'neutral'}>
                          {p.contractType === 'public' ? '公共工事' : '民間工事'}
                        </Badge>
                        <Badge variant={p.status === 'active' ? 'success' : 'neutral'}>
                          {STATUS_LABELS[p.status] ?? p.status}
                        </Badge>
                      </div>
                      <p className="text-ink-muted mt-1 text-[12px]">
                        {p.clientName ?? '発注者未設定'}
                        {p.lastShotAt && `　/　最終撮影 ${formatDateOnly(p.lastShotAt)}`}
                      </p>
                    </div>
                    <p className="tabular text-ink-muted shrink-0 text-[13px]">
                      {p.photoCount.toLocaleString('ja-JP')} 枚
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
