import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldAlert, Megaphone, TriangleAlert, Info } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { requireSession } from '@/lib/auth/session';
import { listNotices, markNoticesRead } from '@/lib/queries/notifications';
import { formatShotAt } from '@/lib/utils';

export const metadata: Metadata = { title: '通知' };
// 既読の状態が即座に反映される必要があるため、都度描画する。
export const dynamic = 'force-dynamic';

const STYLES = {
  critical: { icon: ShieldAlert, tone: 'text-danger bg-danger-tint' },
  warning: { icon: TriangleAlert, tone: 'text-accent bg-accent/12' },
  info: { icon: Info, tone: 'text-brand bg-brand-tint' },
} as const;

export default async function NotificationsPage() {
  const { user, organization } = await requireSession();
  const notices = await listNotices(organization.id, user.id);

  /*
   * 開いた時点で既読にする。ベルの数字が減らないと、何度開いても
   * 「未読が残っている」ように見えるため。
   */
  await markNoticesRead(
    organization.id,
    user.id,
    notices.filter((n) => !n.read).map((n) => n.id),
  );

  return (
    <>
      <PageHeader title="通知" />
      <div className="px-8 pt-8 pb-16 xl:px-[31px]">
        {notices.length === 0 ? (
          <div className="border-border-subtle grid place-items-center rounded-[14px] border border-dashed bg-white px-6 py-16 text-center">
            <Megaphone className="text-brand/30 size-10" strokeWidth={1.3} aria-hidden />
            <h2 className="mt-4 text-[15px] font-bold text-ink">通知はありません</h2>
            <p className="text-ink-muted mt-2 text-[13px]">
              運営からのお知らせや、確認が必要な写真があるとここに表示されます。
            </p>
          </div>
        ) : (
          <ul className="border-border-subtle divide-border-subtle divide-y overflow-hidden rounded-[10px] border bg-white">
            {notices.map((n) => {
              const { icon: Icon, tone } = STYLES[n.level] ?? STYLES.info;
              const inner = (
                <>
                  <span className={`grid size-10 shrink-0 place-items-center rounded-full ${tone}`}>
                    <Icon className="size-5" strokeWidth={1.7} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="flex flex-wrap items-center gap-2 text-[14px] font-bold text-ink">
                      {n.title}
                      {!n.read && (
                        <span className="bg-brand rounded-[4px] px-2 py-0.5 text-[10px] text-white">未読</span>
                      )}
                    </h2>
                    {n.body && (
                      <p className="text-ink-muted mt-1.5 text-[13px] leading-[1.9] whitespace-pre-wrap">{n.body}</p>
                    )}
                  </div>
                  <time
                    className="tabular text-ink-faint shrink-0 text-[12px]"
                    dateTime={n.createdAt.toISOString()}
                  >
                    {n.source === 'derived' ? '現在' : formatShotAt(n.createdAt)}
                  </time>
                </>
              );

              return (
                <li key={n.id}>
                  {n.linkUrl ? (
                    <Link href={n.linkUrl} className="hover:bg-surface-muted flex gap-4 px-6 py-5 transition-colors">
                      {inner}
                    </Link>
                  ) : (
                    <div className="flex gap-4 px-6 py-5">{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
