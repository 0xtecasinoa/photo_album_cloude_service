import type { Metadata } from 'next';
import { requirePlatformAdmin } from '@/lib/auth/admin';
import { listAllOrganizations } from '@/lib/queries/admin';
import { OrganizationsTable } from '@/components/admin/admin-table';

export const metadata: Metadata = { title: '会社 — 運営管理' };

export default async function AdminOrganizationsPage() {
  await requirePlatformAdmin('/admin/organizations');
  const organizations = await listAllOrganizations();

  return (
    <>
      <h1 className="text-[24px] font-bold text-white">会社</h1>
      <p className="mt-2 mb-8 text-[13px] text-white/50">
        停止すると、その会社のユーザーは全員ログインできなくなります。データは消えません。
      </p>
      <OrganizationsTable organizations={organizations} />
    </>
  );
}
