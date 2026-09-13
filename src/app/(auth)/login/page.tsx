import type { Metadata } from 'next';
import Link from 'next/link';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GoogleButton } from '@/components/app/google-button';

export const metadata: Metadata = { title: 'ログイン' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const { error, callbackUrl } = await searchParams;

  return (
    <>
      <h1 className="text-brand text-[32px] font-bold">ログイン</h1>

      {error && (
        <p
          role="alert"
          className="border-danger/40 bg-danger-tint text-danger mt-6 rounded-[8px] border px-4 py-3 text-[13px]"
        >
          メールアドレスまたはパスワードが正しくありません。
        </p>
      )}

      <form className="mt-12 space-y-8" action="/api/auth/callback/credentials" method="post">
        <input type="hidden" name="callbackUrl" value={callbackUrl ?? '/dashboard'} />

        <div>
          <Label htmlFor="email">メールアドレス</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="メールアドレスを入力してください"
            className="mt-2"
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <Label htmlFor="password">パスワード</Label>
            <Link href="/forgot-password" className="text-brand-link text-[12px] hover:underline">
              パスワードをお忘れですか？
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="パスワードを入力してください"
            className="mt-2"
          />
        </div>

        <Button type="submit" variant="primary" className="h-[57px] w-full rounded-[10px] text-[19px]">
          ログイン
        </Button>
      </form>

      <p className="text-ink-muted my-6 text-center text-[13px]">または</p>
      <GoogleButton label="Googleでログイン" />

      <p className="text-ink-muted mt-12 text-center text-[12px]">
        アカウントをお持ちでないですか？{' '}
        <Link href="/signup" className="text-accent font-bold hover:underline">
          新規登録はこちら
        </Link>
      </p>
    </>
  );
}
