import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from './login-form';
import { GoogleButton } from '@/components/app/google-button';

export const metadata: Metadata = { title: 'ログイン' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; invited?: string }>;
}) {
  const { callbackUrl, invited } = await searchParams;
  // Only accept same-site paths — an absolute URL here would be an open redirect.
  const safeCallback = callbackUrl?.startsWith('/') && !callbackUrl.startsWith('//')
    ? callbackUrl
    : '/dashboard';

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
