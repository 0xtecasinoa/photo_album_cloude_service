import type { Metadata } from 'next';
import { requirePlatformAdmin } from '@/lib/auth/admin';
import { listAllNotices } from '@/lib/queries/notifications';
import { listAllOrganizations } from '@/lib/queries/admin';
import { NoticeComposer } from '@/components/admin/notice-composer';

export const metadata: Metadata = { title: 'お知らせ配信 — 運営管理' };

export default async function AdminNotificationsPage() {
  await requirePlatformAdmin('/admin/notifications');
  const [notices, organizations] = await Promise.all([listAllNotices(), listAllOrganizations()]);

  return (
    <>
      <h1 className="text-[24px] font-bold text-white">お知らせ配信</h1>
      <p className="mt-2 mb-8 text-[13px] text-white/50">
        利用者の通知画面とベルに表示されます。宛先は全社か、会社を指定できます。
      </p>
      <NoticeComposer
        notices={notices}
        organizations={organizations.map((o) => ({ id: o.id, name: o.name }))}
      />
    </>
  );
}
