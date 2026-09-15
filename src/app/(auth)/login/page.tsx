import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from './login-form';
import { GoogleButton } from '@/components/app/google-button';
import { redirect } from 'next/navigation';
import { safeCallbackUrl } from '@/lib/auth/callback-url';
import { getSessionContext } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'ログイン' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; invited?: string }>;
}) {
  const { callbackUrl, invited } = await searchParams;
  const safeCallback = safeCallbackUrl(callbackUrl);

  /*
   * すでに入っている人には、もう一度ログイン画面を見せない。
   * 見せると「入れていない」と受け取られ、同じ資格情報を打ち直すことになる。
   */
  if (await getSessionContext()) redirect(safeCallback);

  return (
    <>
      <h1 className="text-brand text-[32px] font-bold">ログイン</h1>
      {invited && (
        <p className="border-success/40 bg-success-tint text-success mt-6 rounded-[8px] border px-4 py-3 text-[13px]">
          パスワードを設定しました。設定したパスワードでログインしてください。
        </p>
      )}
      <LoginForm callbackUrl={safeCallback} />
      <GoogleButton label="Googleでログイン" callbackUrl={safeCallback} />
      <p className="text-ink-muted mt-12 text-center text-[12px]">
        アカウントをお持ちでないですか？{' '}
        <Link href="/signup" className="text-accent font-bold hover:underline">
          新規登録はこちら
        </Link>
      </p>
    </>
  );
}
