import type { Metadata } from 'next';
import Link from 'next/link';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GoogleButton } from '@/components/app/google-button';

export const metadata: Metadata = { title: 'アカウントを作成' };

export default function SignupPage() {
  return (
    <>
      <h1 className="text-brand text-[32px] font-bold">アカウントを作成</h1>

      <form className="mt-12 space-y-8" action="/api/auth/signup" method="post">
        <div>
          <Label htmlFor="name">氏名</Label>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            required
            placeholder="お名前を入力してください"
            className="mt-2"
          />
        </div>

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
          <Label htmlFor="password">パスワード</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="パスワードを作成"
            className="mt-2"
          />
          <p className="text-ink-muted mt-2 text-xs">8文字以上で入力してください。</p>
        </div>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            name="terms"
            required
            defaultChecked
            className="accent-accent mt-0.5 size-[15px] shrink-0"
          />
          <span className="text-[13px] text-ink">
            <Link href="/terms" className="text-brand-link underline">
              利用規約
            </Link>
            および
            <Link href="/privacy" className="text-brand-link underline">
              プライバシーポリシー
            </Link>
            に同意します
          </span>
        </label>

        <Button type="submit" variant="primary" className="h-[57px] w-full rounded-[10px] text-[19px]">
          続ける
        </Button>
      </form>

      <p className="text-ink-muted my-6 text-center text-[13px]">または</p>
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
