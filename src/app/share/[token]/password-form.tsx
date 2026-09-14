'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { submitSharePasswordAction, type SharePasswordState } from './actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={pending} className="h-[50px] w-full rounded-[10px]">
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {pending ? '確認中…' : '閲覧する'}
    </Button>
  );
}

export function SharePasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState<SharePasswordState, FormData>(
    submitSharePasswordAction,
    {},
  );

  return (
    <form action={formAction} className="mt-7 space-y-5">
      <input type="hidden" name="token" value={token} />
      {state.error && (
        <p role="alert" className="border-danger/40 bg-danger-tint text-danger rounded-[8px] border px-4 py-3 text-[13px]">
          {state.error}
        </p>
      )}
      <div>
        <Label htmlFor="share-password">パスワード</Label>
        <Input
          id="share-password"
          name="password"
          type="password"
          autoComplete="off"
          required
          className="mt-2"
        />
      </div>
      <SubmitButton />
    </form>
  );
}
