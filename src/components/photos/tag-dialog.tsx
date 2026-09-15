'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Tag, X, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { updateTagsAction } from '@/app/(app)/projects/[projectId]/tag-actions';

/** 現場でよく使う区切り。撮影中に付けたくなるものを先に出す。 */
const SUGGESTIONS = ['要確認', '再撮影', '提出用', '手直し', '完成', '立会'];

export function TagDialog({
  projectId,
  photoIds,
  onDone,
}: {
  projectId: string;
  photoIds: string[];
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [add, setAdd] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const push = (value: string) => {
    const v = value.trim();
    if (!v || add.includes(v)) return;
    setAdd((prev) => [...prev, v]);
    setDraft('');
  };

  const submit = (remove: string[] = []) => {
    setError(null);
    startTransition(async () => {
      const result = await updateTagsAction(projectId, photoIds, add, remove);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setAdd([]);
      onDone();
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-brand hover:bg-brand-tint flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-[12px] font-bold transition-colors"
      >
        <Tag className="size-3.5" aria-hidden />
        タグを付ける
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[#0B1849]/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tag-title"
          onMouseDown={(e) => {
            if (!dialogRef.current?.contains(e.target as Node)) setOpen(false);
          }}
        >
          <div ref={dialogRef} className="w-full max-w-[520px] rounded-[14px] bg-white p-7 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="tag-title" className="text-brand text-[20px] font-bold">タグを付ける</h2>
                <p className="text-ink-muted mt-1 text-[12px]">
                  選択中の {photoIds.length} 枚に付けます。既にあるタグは消えません。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="閉じる"
                className="text-ink-muted hover:bg-surface-sunken grid size-9 place-items-center rounded-full"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            {error && (
              <p role="alert" className="border-danger/40 bg-danger-tint text-danger mb-4 rounded-[8px] border px-4 py-3 text-[13px]">
                {error}
              </p>
            )}

            <Label htmlFor="tag-input">追加するタグ</Label>
            <form
              className="mt-2 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                push(draft);
              }}
            >
              <Input
                id="tag-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="要確認"
                maxLength={30}
              />
              <Button type="submit" variant="outline">
                <Plus className="size-4" aria-hidden />
                追加
              </Button>
            </form>

            {add.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {add.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setAdd((prev) => prev.filter((x) => x !== t))}
                    className="bg-brand flex items-center gap-1.5 rounded-[30px] px-3 py-1 text-[12px] text-white"
                  >
                    {t}
                    <X className="size-3" aria-hidden />
                  </button>
                ))}
              </div>
            )}

            <p className="text-ink-muted mt-5 mb-2 text-[12px]">よく使うタグ</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.filter((s) => !add.includes(s)).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => push(s)}
                  className="border-border text-ink-muted hover:border-brand hover:text-brand rounded-[30px] border px-3 py-1 text-[12px] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="mt-7 flex justify-end gap-3">
              <Button type="button" variant="outline" size="lg" onClick={() => setOpen(false)}>
                キャンセル
              </Button>
              <Button
                type="button"
                variant="primary"
                size="lg"
                disabled={pending || add.length === 0}
                onClick={() => submit()}
              >
                {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
                {pending ? '保存中…' : `${photoIds.length}枚に付ける`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
