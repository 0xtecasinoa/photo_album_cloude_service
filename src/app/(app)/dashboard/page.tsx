import type { Metadata } from 'next';
import Link from 'next/link';
import { PlusCircle, Camera, ShieldCheck, FolderOpen, ArrowRight } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { demoProject, demoPhotos } from '@/lib/demo-data';
import { formatShotAt } from '@/lib/utils';

export const metadata: Metadata = { title: 'ダッシュボード' };

export default function DashboardPage() {
  const unverified = demoPhotos.filter((p) => p.integrityValid === false).length;
  const unanalysed = demoPhotos.filter((p) => !p.analysed).length;

  const stats = [
    { label: '進行中の現場', value: '4', unit: '件', icon: FolderOpen },
    { label: '今月の撮影枚数', value: '1,284', unit: '枚', icon: Camera },
    { label: '署名検証エラー', value: String(unverified), unit: '枚', icon: ShieldCheck, alert: unverified > 0 },
    { label: 'AI未解析', value: String(unanalysed), unit: '枚', icon: Camera, alert: unanalysed > 0 },
  ];

  return (
    <>
      <PageHeader
        title="ダッシュボード"
        actions={
          <Button variant="primary" size="lg">
            <PlusCircle className="size-4" aria-hidden />
            現場を追加
          </Button>
        }
      />

      <div className="px-8 pt-8 xl:px-[31px]">
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ label, value, unit, icon: Icon, alert }) => (
            <div key={label} className="border-border-subtle rounded-[10px] border bg-white px-6 py-5">
              <div className="flex items-center justify-between">
                <p className="text-ink-muted text-[13px]">{label}</p>
                <Icon
                  className={alert ? 'text-danger size-[18px]' : 'text-brand-link size-[18px]'}
                  strokeWidth={1.7}
                  aria-hidden
                />
              </div>
              <p className="mt-3 flex items-baseline gap-1.5">
                <span className={`tabular text-[30px] leading-none font-bold ${alert ? 'text-danger' : 'text-ink'}`}>
                  {value}
                </span>
                <span className="text-ink-muted text-[13px]">{unit}</span>
              </p>
            </div>
          ))}
        </div>

        <section className="mt-12">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-brand text-[17px] font-bold">進行中の現場</h2>
            <Link href="/projects" className="text-brand-link flex items-center gap-1 text-[13px] hover:underline">
              すべて見る
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>

          <Link
            href="/projects"
            className="border-border-subtle hover:border-brand block rounded-[10px] border bg-white px-7 py-6 transition-colors"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-[17px] font-bold text-ink">{demoProject.name}</h3>
                  <Badge variant="admin">公共工事</Badge>
                </div>
                <p className="text-ink-muted mt-2 text-[13px]">
                  {demoProject.clientName}　/　工事番号 {demoProject.code}
                </p>
              </div>
              <p className="tabular text-ink-muted shrink-0 text-[13px]">
                {demoProject.photoCount.toLocaleString('ja-JP')} 枚
              </p>
            </div>
          </Link>
        </section>

        <section className="mt-12 pb-16">
          <h2 className="text-brand mb-5 text-[17px] font-bold">最近の撮影</h2>
          <ul className="border-border-subtle divide-border-subtle divide-y overflow-hidden rounded-[10px] border bg-white">
            {demoPhotos.slice(0, 5).map((p) => (
              <li key={p.id} className="flex items-center gap-4 px-6 py-4">
                <div
                  className="size-[52px] shrink-0 rounded-[6px]"
                  style={{ backgroundColor: p.thumbnailTone }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] text-ink">
                    {p.category}　{p.workDetail}
                  </p>
                  <p className="tabular text-ink-muted text-[12px]">{formatShotAt(p.takenAt)}</p>
                </div>
                {p.integrityValid === false ? (
                  <Badge variant="danger">署名未検証</Badge>
                ) : (
                  <Badge variant="success">署名OK</Badge>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
