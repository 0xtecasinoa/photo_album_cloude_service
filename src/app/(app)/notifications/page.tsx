import type { Metadata } from 'next';
import { ShieldAlert, UserPlus, FileCheck2 } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { formatShotAt } from '@/lib/utils';

export const metadata: Metadata = { title: '通知' };

const NOTICES = [
  {
    icon: ShieldAlert,
    tone: 'text-danger bg-danger-tint',
    title: '署名が検証できない写真が1枚あります',
    body: '○○橋梁上部工事（令和6年度）／ 仮設工（足場組立）。電子納品の出力前に除外または差し替えが必要です。',
    at: new Date(Date.UTC(2026, 3, 28, 2, 10)),
  },
  {
    icon: UserPlus,
    tone: 'text-brand bg-brand-tint',
    title: '高橋 美咲 さんが現場に参加しました',
    body: '権限：編集者 ／ 所属：大和建設工業',
    at: new Date(Date.UTC(2026, 3, 27, 8, 42)),
  },
  {
    icon: FileCheck2,
    tone: 'text-success bg-success-tint',
    title: '写真台帳のPDF出力が完了しました',
    body: '国道357号 舗装・電線工事 写真台帳（全5枚）',
    at: new Date(Date.UTC(2026, 3, 26, 5, 5)),
  },
];

export default function NotificationsPage() {
  return (
    <>
      <PageHeader title="通知" />
      <div className="px-8 pt-8 xl:px-[31px]">
        <ul className="border-border-subtle divide-border-subtle divide-y overflow-hidden rounded-[10px] border bg-white">
          {NOTICES.map(({ icon: Icon, tone, title, body, at }) => (
            <li key={title} className="flex gap-4 px-6 py-5">
              <span className={`grid size-10 shrink-0 place-items-center rounded-full ${tone}`}>
                <Icon className="size-5" strokeWidth={1.7} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-[14px] font-bold text-ink">{title}</h2>
                <p className="text-ink-muted mt-1.5 text-[13px] leading-[1.9]">{body}</p>
              </div>
              <time className="tabular text-ink-faint shrink-0 text-[12px]" dateTime={at.toISOString()}>
                {formatShotAt(at)}
              </time>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
