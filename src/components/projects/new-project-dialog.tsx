'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { PlusCircle, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Label, Select } from '@/components/ui/input';
import { createProjectAction, type ProjectFormState } from '@/app/(app)/projects/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" size="lg" disabled={pending}>
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {pending ? '作成中…' : '現場を作成'}
    </Button>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p role="alert" className="text-danger mt-1.5 text-[12px]">{message}</p>;
}

export function NewProjectDialog({ canCreate }: { canCreate: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ProjectFormState, FormData>(createProjectAction, {});
  const dialogRef = useRef<HTMLDivElement>(null);

  // Esc で閉じられるようにする。モーダルを開いたまま行き止まりにしないため。
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!canCreate) return null;

  return (
    <>
      <Button variant="primary" size="lg" onClick={() => setOpen(true)}>
        <PlusCircle className="size-4" aria-hidden />
        現場を追加
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#0B1849]/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-project-title"
          onMouseDown={(e) => {
            // 背景を押したときだけ閉じる。入力中にドラッグして
            // 外で離しただけで消えると、書いた内容が失われるため。
            if (!dialogRef.current?.contains(e.target as Node)) setOpen(false);
          }}
        >
          <div
            ref={dialogRef}
            className="max-h-[90vh] w-full max-w-[620px] overflow-y-auto rounded-[14px] bg-white p-7 shadow-2xl"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <h2 id="new-project-title" className="text-brand text-[20px] font-bold">現場を追加</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="閉じる"
                className="text-ink-muted hover:bg-surface-sunken grid size-9 place-items-center rounded-full"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            <form action={formAction} className="space-y-5" noValidate>
              {state.error && (
                <p role="alert" className="border-danger/40 bg-danger-tint text-danger rounded-[8px] border px-4 py-3 text-[13px]">
                  {state.error}
                </p>
              )}

              <div>
                <Label htmlFor="np-name">工事名称 *</Label>
                <Input id="np-name" name="name" required className="mt-2"
                  placeholder="○○橋梁上部工事（令和6年度）" />
                <FieldError message={state.fieldErrors?.name} />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="np-code">工事番号</Label>
                  <Input id="np-code" name="code" className="mt-2" placeholder="R6-0412" />
                  <FieldError message={state.fieldErrors?.code} />
                </div>
                <div>
                  <Label htmlFor="np-type">発注区分</Label>
                  <Select id="np-type" name="contractType" className="mt-2" defaultValue="private">
                    <option value="private">民間工事</option>
                    <option value="public">公共工事（電子納品あり）</option>
                  </Select>
                  <p className="text-ink-muted mt-1.5 text-[11px]">
                    公共工事を選ぶと、電子納品の適合チェックが有効になります。
                  </p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="np-client">発注者名</Label>
                  <Input id="np-client" name="clientName" className="mt-2" placeholder="国土交通省 関東地方整備局" />
                </div>
                <div>
                  <Label htmlFor="np-contractor">請負者名</Label>
                  <Input id="np-contractor" name="contractorName" className="mt-2" placeholder="自社名（JV の場合は JV 名）" />
                </div>
              </div>

              <div>
                <Label htmlFor="np-location">施工場所</Label>
                <Input id="np-location" name="location" className="mt-2" placeholder="千葉県市川市" />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="np-start">工期開始</Label>
                  <Input id="np-start" name="startDate" type="date" className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="np-end">工期終了</Label>
                  <Input id="np-end" name="endDate" type="date" className="mt-2" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" size="lg" onClick={() => setOpen(false)}>
                  キャンセル
                </Button>
                <SubmitButton />
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
