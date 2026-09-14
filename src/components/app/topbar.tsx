import Link from 'next/link';
import { CircleHelp, Bell, LogOut } from 'lucide-react';
import { signOutAction } from '@/app/(app)/actions';

export type TopbarProps = {
  userName: string;
  roleLabel: string;
  avatarUrl?: string | null;
  notificationCount?: number;
};

export function Topbar({ userName, roleLabel, avatarUrl, notificationCount = 0 }: TopbarProps) {
  return (
    <div className="flex h-[100px] items-center justify-end gap-6 pr-[52px]">
      <Link
        href="/help"
        className="text-brand hover:bg-brand-tint grid size-10 place-items-center rounded-full transition-colors"
        aria-label="ヘルプ"
      >
        <CircleHelp className="size-[22px]" strokeWidth={1.6} aria-hidden />
      </Link>

      <Link
        href="/notifications"
        className="text-brand hover:bg-brand-tint relative grid size-10 place-items-center rounded-full transition-colors"
        aria-label={
          notificationCount > 0 ? `通知 ${notificationCount}件` : '通知'
        }
      >
        <Bell className="size-[22px]" strokeWidth={1.6} aria-hidden />
        {notificationCount > 0 && (
          <span
            className="bg-accent absolute top-1 right-1 grid size-[16px] place-items-center rounded-full text-[9px] font-bold text-white"
            aria-hidden
          >
            {notificationCount > 9 ? '9+' : notificationCount}
          </span>
        )}
      </Link>

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
