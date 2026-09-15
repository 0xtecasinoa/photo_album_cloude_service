import Link from 'next/link';
import { CircleHelp, LogOut, ShieldCheck } from 'lucide-react';
import { NoticeBell } from '@/components/app/notice-bell';
import { signOutAction } from '@/app/(app)/actions';

export type TopbarProps = {
  userName: string;
  roleLabel: string;
  avatarUrl?: string | null;
  notificationCount?: number;
  /** 運営管理者かどうか。運営管理へ移る導線を出すかの判断に使う。 */
  isPlatformAdmin?: boolean;
};

export function Topbar({
  userName,
  roleLabel,
  avatarUrl,
  notificationCount = 0,
  isPlatformAdmin = false,
}: TopbarProps) {
  return (
    <div className="flex h-[100px] items-center justify-end gap-6 pr-[52px]">
      {/*
        運営管理へ移る導線。権限を持つ人にだけ出します。URL を覚えていないと
        たどり着けないのは不便で、かといって全員に見せると
        「入れない画面」を案内することになるためです。
      */}
      {isPlatformAdmin && (
        <Link
          href="/admin"
          className="border-brand/30 text-brand hover:bg-brand-tint flex items-center gap-2 rounded-[30px] border px-4 py-2 text-[13px] font-bold transition-colors"
        >
          <ShieldCheck className="size-4" aria-hidden />
          運営管理へ
        </Link>
      )}

      <Link
        href="/help"
        className="text-brand hover:bg-brand-tint grid size-10 place-items-center rounded-full transition-colors"
        aria-label="ヘルプ"
      >
        <CircleHelp className="size-[22px]" strokeWidth={1.6} aria-hidden />
      </Link>

      <NoticeBell count={notificationCount} />

      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- avatars are user-supplied remote URLs */}
        <img
          src={avatarUrl || '/brand/avatar-placeholder.svg'}
          alt=""
          className="size-[46px] rounded-full object-cover"
        />
        <div className="leading-tight">
          <p className="text-sm font-bold text-ink">{userName}</p>
          <p className="text-xs text-ink-muted">{roleLabel}</p>
        </div>

        <form action={signOutAction}>
          <button
            type="submit"
            className="text-ink-muted hover:bg-surface-sunken hover:text-danger ml-1 grid size-10 place-items-center rounded-full transition-colors"
            aria-label="ログアウト"
            title="ログアウト"
          >
            <LogOut className="size-[18px]" strokeWidth={1.8} aria-hidden />
          </button>
        </form>
      </div>
    </div>
  );
}
