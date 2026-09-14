import type { Metadata } from 'next';
import Link from 'next/link';
import { findInvite } from '@/lib/queries/members';
import { AcceptInviteForm } from './accept-invite-form';

export const metadata: Metadata = { title: '招待を受ける' };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await findInvite(token);

  if (!invite) {
    return (
      <>
        <h1 className="text-brand text-[32px] font-bold">招待リンクが無効です</h1>
        <p className="text-ink-muted mt-6 text-[14px] leading-7">
          このリンクは有効期限が切れているか、すでに使用されています。
          お手数ですが、招待した担当者に再発行を依頼してください。
        </p>
        <Link
          href="/login"
          className="text-accent mt-10 inline-block text-[14px] font-bold hover:underline"
        >
          ログイン画面へ
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="text-brand text-[32px] font-bold">パスワードを設定</h1>
      <p className="text-ink-muted mt-4 text-[14px] leading-7">
        <span className="font-bold text-ink">{invite.organizationName}</span> から
        らくらく写真台帳に招待されています。
        <br />
        {invite.email} でログインするためのパスワードを設定してください。
      </p>
      <AcceptInviteForm token={invite.token} email={invite.email} />
    </>
  );
}
