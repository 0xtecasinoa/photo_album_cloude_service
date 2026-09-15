import type { Metadata } from 'next';
import Link from 'next/link';
import { SignupForm } from './signup-form';
import { GoogleButton } from '@/components/app/google-button';
import { redirect } from 'next/navigation';
import { getSessionContext } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'アカウントを作成' };

export default async function SignupPage() {
  // ログイン中に新規登録を開くのは、たいてい押し間違い。
  // 別の会社を作らせるより、いまの画面へ戻す。
  if (await getSessionContext()) redirect('/dashboard');

  return (
    <>
      <h1 className="text-brand text-[32px] font-bold">アカウントを作成</h1>
      <SignupForm />
      <GoogleButton label="Googleで登録" />
      <p className="text-ink-muted mt-12 text-center text-[12px]">
        すでにアカウントをお持ちですか？{' '}
        <Link href="/login" className="text-accent font-bold hover:underline">
          ログインはこちら
        </Link>
      </p>
    </>
  );
}
