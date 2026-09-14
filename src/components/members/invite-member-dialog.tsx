'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { UserPlus, X, Loader2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/input';
import { inviteMemberAction, type InviteFormState } from '@/app/(app)/members/actions';
import type { OrgRole } from '@/lib/queries/members';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" size="lg" disabled={pending}>
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {pending ? '招待中…' : '招待する'}
    </Button>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p role="alert" className="text-danger mt-1.5 text-[12px]">{message}</p>;
}

function InviteLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="border-success/40 bg-success-tint rounded-[10px] border px-5 py-4">
      <p className="text-success text-[13px] font-bold">招待リンクを発行しました</p>
      <p className="text-ink-muted mt-1 text-[12px]">
        このリンクを本人にお渡しください。7日間有効で、パスワードはご本人が設定します。
      </p>
      <div className="mt-3 flex items-center gap-2">
        <input
          readOnly
          value={url}
          aria-label="招待リンク"
          onFocus={(e) => e.currentTarget.select()}
          className="border-border h-10 min-w-0 flex-1 rounded-[8px] border bg-white px-3 text-[12px]"
        />
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              // クリップボードが使えない環境（http の別ホストなど）では
              // 入力欄から手動でコピーしてもらう。
              setCopied(false);
            }
          }}
        >
          {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copied ? 'コピーしました' : 'コピー'}
        </Button>
      </div>
    </div>
  );
}

export function InviteMemberDialog({ roles, canInvite }: { roles: OrgRole[]; canInvite: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<InviteFormState, FormData>(inviteMemberAction, {});
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!canInvite) return null;

  // 既定は「編集者」。オーナー権限を既定にすると押し間違いの被害が大きい。
  const defaultRole = roles.find((r) => r.slug === 'editor') ?? roles[0];

  return (
    <>
      <Button variant="primary" size="lg" onClick={() => setOpen(true)}>
        <UserPlus className="size-4" aria-hidden />
        メンバーを招待
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#0B1849]/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-title"
          onMouseDown={(e) => {
            if (!dialogRef.current?.contains(e.target as Node)) setOpen(false);
          }}
        >
          <div
            ref={dialogRef}
            className="max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-[14px] bg-white p-7 shadow-2xl"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <h2 id="invite-title" className="text-brand text-[20px] font-bold">メンバーを招待</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="閉じる"
                className="text-ink-muted hover:bg-surface-sunken grid size-9 place-items-center rounded-full"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            {state.inviteUrl ? (
              <div className="space-y-5">
                <InviteLink url={state.inviteUrl} />
                <div className="flex justify-end">
                  <Button type="button" variant="primary" size="lg" onClick={() => setOpen(false)}>
                    閉じる
                  </Button>
                </div>
              </div>
            ) : (
              <form action={formAction} className="space-y-5" noValidate>
                {state.error && (
                  <p role="alert" className="border-danger/40 bg-danger-tint text-danger rounded-[8px] border px-4 py-3 text-[13px]">
                    {state.error}
                  </p>
                )}

                <div>
                  <Label htmlFor="iv-name">氏名 *</Label>
                  <Input id="iv-name" name="name" required className="mt-2" placeholder="山田 太郎" />
                  <FieldError message={state.fieldErrors?.name} />
                </div>

                <div>
                  <Label htmlFor="iv-email">メールアドレス *</Label>
                  <Input id="iv-email" name="email" type="email" required className="mt-2"
                    placeholder="taro.yamada@example.co.jp" />
                  <FieldError message={state.fieldErrors?.email} />
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="iv-role">権限 *</Label>
                    <Select id="iv-role" name="roleId" className="mt-2" defaultValue={defaultRole?.id}>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </Select>
                    <FieldError message={state.fieldErrors?.roleId} />
                  </div>
                  <div>
                    <Label htmlFor="iv-dept">所属会社・部署</Label>
                    <Input id="iv-dept" name="department" className="mt-2" placeholder="工事部" />
                  </div>
                </div>

                <p className="text-ink-muted border-border-subtle bg-surface-muted rounded-[8px] border px-4 py-3 text-[12px]">
                  権限は現場ごとに上書きできます。協力会社の方には「協力会社」を選ぶと、
                  指定した現場の閲覧のみに制限されます。
                </p>

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" size="lg" onClick={() => setOpen(false)}>
                    キャンセル
                  </Button>
                  <SubmitButton />
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
