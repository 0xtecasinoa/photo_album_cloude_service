import type { Metadata } from 'next';
import { requirePlatformAdmin } from '@/lib/auth/admin';
import { listAllUsers } from '@/lib/queries/admin';
import { UsersTable } from '@/components/admin/admin-table';

export const metadata: Metadata = { title: 'ユーザー — 運営管理' };

export default async function AdminUsersPage() {
  const admin = await requirePlatformAdmin('/admin/users');
  const users = await listAllUsers();

  return (
    <>
      <h1 className="text-[24px] font-bold text-white">ユーザー</h1>
      <p className="mt-2 mb-8 text-[13px] text-white/50">
        全社のユーザーを表示しています。停止しても行は残ります（写真の撮影者や監査ログの記録が
        たどれなくなるため）。
      </p>
      <UsersTable users={users} currentAdminId={admin.id} />
    </>
  );
}
