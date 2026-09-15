import type { Metadata } from 'next';
import { requirePlatformAdmin } from '@/lib/auth/admin';
import { listLoginEvents } from '@/lib/queries/admin';
import { LoginHistory } from '@/components/admin/login-history';

export const metadata: Metadata = { title: 'ログイン履歴 — 運営管理' };

export default async function AdminLoginsPage() {
  await requirePlatformAdmin('/admin/logins');
  const events = await listLoginEvents();

  return (
    <>
      <h1 className="text-[24px] font-bold text-white">ログイン履歴</h1>
      <p className="mt-2 mb-8 text-[13px] text-white/50">
        直近200件です。失敗も記録しています（心当たりのないログインの調査に使います）。
        存在しないメールアドレスでの試行は、会社を特定できないため記録していません。
      </p>
      <LoginHistory events={events} />
    </>
  );
}
