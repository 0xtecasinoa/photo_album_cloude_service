'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { acceptInviteAction, type InviteAcceptState } from '../actions';

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
      {pending ? '設定中…' : 'パスワードを設定して開始'}
    </Button>
  );
}

export function AcceptInviteForm({ token, email }: { token: string; email: string }) {
  const [state, formAction] = useActionState<InviteAcceptState, FormData>(acceptInviteAction, {});

  return (
    <form className="mt-10 space-y-7" action={formAction} noValidate>
      <input type="hidden" name="token" value={token} />

      {state.error && (
        <p role="alert" className="border-danger/40 bg-danger-tint text-danger rounded-[8px] border px-4 py-3 text-[13px]">
          {state.error}
        </p>
      )}

      <div>
        <Label htmlFor="iv-email">メールアドレス</Label>
        <Input id="iv-email" value={email} readOnly disabled className="mt-2" />
      </div>

      <div>
        <Label htmlFor="iv-password">パスワード</Label>
        <Input
          id="iv-password" name="password" type="password" autoComplete="new-password"
          required minLength={8} placeholder="パスワードを作成" className="mt-2"
          aria-invalid={Boolean(state.fieldErrors?.password)}
        />
        {state.fieldErrors?.password ? (
          <p role="alert" className="text-danger mt-1.5 text-[12px]">{state.fieldErrors.password}</p>
        ) : (
          <p className="text-ink-muted mt-2 text-xs">8文字以上で入力してください。</p>
        )}
      </div>

      <div>
        <Label htmlFor="iv-confirm">パスワード（確認）</Label>
        <Input
          id="iv-confirm" name="confirm" type="password" autoComplete="new-password"
          required minLength={8} placeholder="もう一度入力してください" className="mt-2"
          aria-invalid={Boolean(state.fieldErrors?.confirm)}
        />
        {state.fieldErrors?.confirm && (
          <p role="alert" className="text-danger mt-1.5 text-[12px]">{state.fieldErrors.confirm}</p>
        )}
      </div>

      <SubmitButton />
    </form>
  );
}
