import type { Metadata } from 'next';
import Link from 'next/link';
import { SignupForm } from './signup-form';
import { GoogleButton } from '@/components/app/google-button';

export const metadata: Metadata = { title: 'アカウントを作成' };

export default function SignupPage() {
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
