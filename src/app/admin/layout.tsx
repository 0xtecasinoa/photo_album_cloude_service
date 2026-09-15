import Link from 'next/link';
import { ShieldCheck, LayoutDashboard, Building2, Users, Mail, Megaphone, KeyRound, Activity, ArrowLeft } from 'lucide-react';
import { requirePlatformAdmin } from '@/lib/auth/admin';
import { isAccessLogViewer } from '@/lib/access-log/viewer';
import { signOutAction } from '@/app/(app)/actions';
import { RecordAccess } from '@/components/app/record-access';

const NAV = [
  { href: '/admin', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/admin/organizations', label: '会社', icon: Building2 },
  { href: '/admin/users', label: 'ユーザー', icon: Users },
  { href: '/admin/inquiries', label: 'お問い合わせ', icon: Mail },
  { href: '/admin/notifications', label: 'お知らせ配信', icon: Megaphone },
  { href: '/admin/logins', label: 'ログイン履歴', icon: KeyRound },
];

/** アクセスログは閲覧を許された1名にだけ見せる。 */
const VIEWER_ONLY_NAV = { href: '/admin/access-logs', label: 'アクセスログ', icon: Activity };

/**
 * 運営管理コンソール。
 *
 * 見た目を顧客向けの画面とはっきり分けています（濃い配色・「運営管理」の明示）。
 * 全社を横断して見える画面なので、どちらを操作しているのか一目で分からないと
 * 事故につながります。
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requirePlatformAdmin();
  // 見られない人にメニューを出さない。存在を知らせないため。
  const canSeeAccessLogs = await isAccessLogViewer();
  const nav = canSeeAccessLogs ? [...NAV, VIEWER_ONLY_NAV] : NAV;

  return (
    <div className="min-h-dvh bg-[#0E1729]">
      <RecordAccess />
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-8 gap-y-4 px-6 py-4">
          <p className="flex items-center gap-2.5 text-[15px] font-bold text-white">
            <ShieldCheck className="size-5 text-[#F0AE1E]" strokeWidth={1.9} aria-hidden />
            らくらく写真台帳　運営管理
          </p>

          <nav className="flex flex-wrap items-center gap-1" aria-label="運営管理メニュー">
            {nav.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2 rounded-[8px] px-3.5 py-2 text-[13px] text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-4">
            <p className="text-[12px] text-white/60">{admin.email}</p>
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-[8px] border border-white/20 px-3.5 py-2 text-[12px] text-white/80 transition-colors hover:bg-white/10"
            >
              <ArrowLeft className="size-3.5" aria-hidden />
              通常画面へ
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="text-[12px] text-white/60 transition-colors hover:text-white"
              >
                ログアウト
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-6 py-10">{children}</main>
    </div>
  );
}
