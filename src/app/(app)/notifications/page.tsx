import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldAlert, Megaphone, TriangleAlert, Info, CheckCheck } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { requireSession } from '@/lib/auth/session';
import { listNotices } from '@/lib/queries/notifications';
import { formatShotAt } from '@/lib/utils';
import { MarkNoticesRead } from './mark-read';

export const metadata: Metadata = { title: '通知' };
// 既読の状態がその場で反映される必要があるため、都度描画する。
export const dynamic = 'force-dynamic';

const STYLES = {
  critical: { icon: ShieldAlert, tone: 'text-danger bg-danger-tint' },
  warning: { icon: TriangleAlert, tone: 'text-accent bg-accent/12' },
  info: { icon: Info, tone: 'text-brand bg-brand-tint' },
} as const;

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const history = view === 'history';

  const { user, organization } = await requireSession();
  const notices = await listNotices(organization.id, user.id, { includeRead: history });

  // 未読のお知らせだけを既読にする。導出した警告は読む対象ではない。
  const toMarkRead = history
    ? []
    : notices.filter((n) => n.source === 'announcement' && !n.read).map((n) => n.id);

  return (
    <>
      <PageHeader title="通知" />

      {!history && <MarkNoticesRead noticeIds={toMarkRead} />}

      <div className="px-8 pt-8 pb-16 xl:px-[31px]">
        <nav className="mb-6 flex flex-wrap gap-2" aria-label="表示の切り替え">
          <Link
            href="/notifications"
            aria-current={!history ? 'page' : undefined}
            className={
              !history
                ? 'bg-brand rounded-[30px] px-5 py-2 text-[13px] font-bold text-white'
                : 'border-border text-ink-muted hover:bg-surface-muted rounded-[30px] border px-5 py-2 text-[13px] transition-colors'
            }
          >
            新着
          </Link>
          <Link
            href="/notifications?view=history"
            aria-current={history ? 'page' : undefined}
            className={
              history
                ? 'bg-brand rounded-[30px] px-5 py-2 text-[13px] font-bold text-white'
                : 'border-border text-ink-muted hover:bg-surface-muted rounded-[30px] border px-5 py-2 text-[13px] transition-colors'
            }
          >
            確認済み
          </Link>
        </nav>

        {notices.length === 0 ? (
          <div className="border-border-subtle grid place-items-center rounded-[14px] border border-dashed bg-white px-6 py-16 text-center">
            {history ? (
              <>
                <CheckCheck className="text-brand/30 size-10" strokeWidth={1.3} aria-hidden />
                <h2 className="mt-4 text-[15px] font-bold text-ink">確認済みの通知はありません</h2>
              </>
            ) : (
              <>
                <Megaphone className="text-brand/30 size-10" strokeWidth={1.3} aria-hidden />
                <h2 className="mt-4 text-[15px] font-bold text-ink">新しい通知はありません</h2>
                <p className="text-ink-muted mt-2 text-[13px]">
                  確認した通知は
                  <Link href="/notifications?view=history" className="text-brand-link mx-1 underline">
                    確認済み
                  </Link>
                  から見られます。
                </p>
              </>
            )}
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
                      {n.source === 'derived' && (
                        <span className="bg-accent/20 text-accent rounded-[4px] px-2 py-0.5 text-[10px]">
                          対応が必要
                        </span>
                      )}
                    </h2>
                    {n.body && (
                      <p className="text-ink-muted mt-1.5 text-[13px] leading-[1.9] whitespace-pre-wrap">
                        {n.body}
                      </p>
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
                    <Link
                      href={n.linkUrl}
                      className="hover:bg-surface-muted flex gap-4 px-6 py-5 transition-colors"
                    >
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

        {!history && notices.some((n) => n.source === 'announcement') && (
          <p className="text-ink-muted mt-5 text-[12px]">
            この画面を開いた時点で確認済みになります。あとから見返す場合は「確認済み」をご覧ください。
          </p>
        )}
      </div>
    </>
  );
}
