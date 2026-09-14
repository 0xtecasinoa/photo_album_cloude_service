'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { signUpAction, type AuthFormState } from '../actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="primary"
      disabled={pending}
      className="h-[57px] w-full rounded-[10px] text-[19px]"
    >
      {pending && <Loader2 className="size-5 animate-spin" aria-hidden />}
      {pending ? '登録中…' : '続ける'}
    </Button>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-danger mt-1.5 text-[12px]">
      {message}
    </p>
  );
}

export function SignupForm() {
  const [state, formAction] = useActionState<AuthFormState, FormData>(signUpAction, {});

  return (
    <form className="mt-10 space-y-7" action={formAction} noValidate>
      {state.error && (
        <p
          role="alert"
          className="border-danger/40 bg-danger-tint text-danger rounded-[8px] border px-4 py-3 text-[13px]"
        >
          {state.error}
        </p>
      )}

      <div>
        <Label htmlFor="name">氏名</Label>
        <Input
          id="name" name="name" autoComplete="name" required
          placeholder="お名前を入力してください" className="mt-2"
          aria-invalid={Boolean(state.fieldErrors?.name)}
        />
        <FieldError message={state.fieldErrors?.name} />
      </div>

      <div>
        <Label htmlFor="companyName">会社名（任意）</Label>
        <Input
          id="companyName" name="companyName" autoComplete="organization"
          placeholder="株式会社〇〇建設" className="mt-2"
        />
        <FieldError message={state.fieldErrors?.companyName} />
      </div>

      <div>
        <Label htmlFor="email">メールアドレス</Label>
        <Input
          id="email" name="email" type="email" autoComplete="email" required
          placeholder="メールアドレスを入力してください" className="mt-2"
          aria-invalid={Boolean(state.fieldErrors?.email)}
        />
        <FieldError message={state.fieldErrors?.email} />
      </div>

      <div>
        <Label htmlFor="password">パスワード</Label>
        <Input
          id="password" name="password" type="password" autoComplete="new-password"
          required minLength={8} placeholder="パスワードを作成" className="mt-2"
          aria-invalid={Boolean(state.fieldErrors?.password)}
        />
        <FieldError message={state.fieldErrors?.password} />
        {!state.fieldErrors?.password && (
          <p className="text-ink-muted mt-2 text-xs">8文字以上で入力してください。</p>
        )}
      </div>

      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" name="terms" required defaultChecked
          className="accent-accent mt-0.5 size-[15px] shrink-0" />
        <span className="text-[13px] text-ink">
          <Link href="/terms" className="text-brand-link underline">利用規約</Link>
          および
          <Link href="/privacy" className="text-brand-link underline">プライバシーポリシー</Link>
          に同意します
        </span>
      </label>

      <SubmitButton />
    </form>
  );
}
