'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { signInAction, type AuthFormState } from '../actions';

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
      {pending ? 'ログイン中…' : 'ログイン'}
    </Button>
  );
}

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(signInAction, {});

  return (
    <form className="mt-10 space-y-7" action={formAction} noValidate>
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      {state.error && (
        <p
          role="alert"
          className="border-danger/40 bg-danger-tint text-danger rounded-[8px] border px-4 py-3 text-[13px]"
        >
          {state.error}
        </p>
      )}

      <div>
        <Label htmlFor="email">メールアドレス</Label>
        <Input
          id="email" name="email" type="email" autoComplete="email" required
          placeholder="メールアドレスを入力してください" className="mt-2"
          aria-invalid={Boolean(state.fieldErrors?.email)}
        />
        {state.fieldErrors?.email && (
          <p role="alert" className="text-danger mt-1.5 text-[12px]">{state.fieldErrors.email}</p>
        )}
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <Label htmlFor="password">パスワード</Label>
          <Link href="/forgot-password" className="text-brand-link text-[12px] hover:underline">
            パスワードをお忘れですか？
          </Link>
        </div>
        <Input
          id="password" name="password" type="password" autoComplete="current-password" required
          placeholder="パスワードを入力してください" className="mt-2"
          aria-invalid={Boolean(state.fieldErrors?.password)}
        />
        {state.fieldErrors?.password && (
          <p role="alert" className="text-danger mt-1.5 text-[12px]">{state.fieldErrors.password}</p>
        )}
      </div>

      <SubmitButton />
    </form>
  );
}
