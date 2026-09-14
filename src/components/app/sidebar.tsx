'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MonitorDot, UserRound, BookOpen, Settings } from 'lucide-react';
import { cn, formatBytes } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

const NAV = [
  { href: '/dashboard', label: 'ダッシュボード', icon: Home },
  { href: '/projects', label: '工事写真台帳', icon: MonitorDot },
  { href: '/members', label: 'メンバー・権限', icon: UserRound },
  { href: '/templates', label: 'テンプレート', icon: BookOpen },
  { href: '/settings', label: '設定・プラン', icon: Settings },
] as const;

export type SidebarProps = {
  storageUsedBytes: number;
  storageQuotaBytes: number;
};

export function Sidebar({ storageUsedBytes, storageQuotaBytes }: SidebarProps) {
  const pathname = usePathname();
  const pct = storageQuotaBytes > 0
    ? Math.min(100, Math.round((storageUsedBytes / storageQuotaBytes) * 100))
    : 0;

  return (
    <aside className="bg-brand flex w-[304px] shrink-0 flex-col text-white">
      <div className="px-4 pt-10 pb-2">
        <Link href="/dashboard" className="inline-block">
          <Image
            src="/brand/logo.png"
            alt="らくらく写真台帳"
            width={180}
            height={143}
            priority
            className="h-[104px] w-[136px] object-contain"
          />
        </Link>
      </div>

      <nav className="mt-8 flex flex-col gap-[25px] px-[18px]">
        {NAV.map(({ href, label, icon: Icon }) => {
          // Exact match for the index route, prefix match for nested pages so a
          // photo detail page keeps 工事写真台帳 highlighted.
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-[43px] items-center gap-4 rounded-[8px] px-3 text-[15px] transition-colors',
                'tracking-nav',
                active ? 'bg-white/12 font-bold' : 'font-medium text-white/90 hover:bg-white/8',
              )}
            >
              <Icon className="size-[22px] shrink-0" strokeWidth={1.6} aria-hidden />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-[34px] pb-10">
        <h2 className="text-[17px] font-bold tracking-nav">ストレージ使用量</h2>
        <div
          className="mt-4 h-[6px] w-full overflow-hidden rounded-full bg-white/25"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="ストレージ使用量"
        >
          <div className="bg-brand-ring h-full rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <p className="tabular mt-2 text-xs text-white/85">
          {formatBytes(storageUsedBytes)} / {formatBytes(storageQuotaBytes)}（{pct}%）
        </p>

        <Link
          href="/settings"
          className={cn(
            buttonVariants({ variant: 'accentOutline', size: 'pill' }),
            'mt-6 w-[187px]',
          )}
        >
          プランを確認する →
        </Link>
      </div>
    </aside>
  );
}
