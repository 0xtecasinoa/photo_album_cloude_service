import type { Metadata } from 'next';
import { requirePlatformAdmin } from '@/lib/auth/admin';
import { listInquiries } from '@/lib/queries/admin';
import { InquiriesList } from '@/components/admin/inquiries-list';

export const metadata: Metadata = { title: 'お問い合わせ — 運営管理' };

export default async function AdminInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requirePlatformAdmin('/admin/inquiries');
  const { status } = await searchParams;
  const inquiries = await listInquiries(status ?? 'all');

  return (
    <>
      <h1 className="text-[24px] font-bold text-white">お問い合わせ</h1>
      <p className="mt-2 mb-8 text-[13px] text-white/50">
        サイトのお問い合わせフォームから届いた内容です。
      </p>
      <InquiriesList inquiries={inquiries} activeStatus={status ?? 'all'} />
    </>
  );
}
