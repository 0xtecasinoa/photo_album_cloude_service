'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, Loader2, CircleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Result = {
  created: { id: string; filename: string }[];
  skipped: { filename: string; reason: string }[];
};

/**
 * 写真の取り込み。
 *
 * 端末のカメラロールから選んでアップロードします。EXIF の撮影日時、
 * サムネイル生成、重複チェックはサーバー側で行います。
 */
export function UploadButton({
  projectId,
  canUpload,
}: {
  projectId: string;
  canUpload: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (!canUpload) return null;

  async function upload(files: FileList) {
    setBusy(true);
    setError(null);
    setResult(null);

    // 一度に送ると大きな現場でタイムアウトするため、少しずつ送る。
    const BATCH = 4;
    const list = Array.from(files);
    const merged: Result = { created: [], skipped: [] };
    setProgress({ done: 0, total: list.length });

    try {
      for (let i = 0; i < list.length; i += BATCH) {
        const slice = list.slice(i, i + BATCH);
        const body = new FormData();
        for (const f of slice) body.append('files', f);

        const res = await fetch(`/api/projects/${projectId}/photos`, { method: 'POST', body });
        const payload = await res.json().catch(() => ({}));

        if (!res.ok && !payload.created) {
          setError(payload.error ?? `アップロードに失敗しました（${res.status}）`);
          break;
        }
        merged.created.push(...(payload.created ?? []));
        merged.skipped.push(...(payload.skipped ?? []));
        setProgress({ done: Math.min(i + BATCH, list.length), total: list.length });
      }

      setResult(merged);
      if (merged.created.length > 0) startTransition(() => router.refresh());
    } catch {
      setError('通信に失敗しました。電波状況を確認して再度お試しください。');
    } finally {
      setBusy(false);
      setProgress(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="sr-only"
        onChange={(e) => e.target.files?.length && upload(e.target.files)}
      />

      <Button
        variant="outline"
        size="lg"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <PlusCircle className="size-4" aria-hidden />}
        {busy && progress
          ? `取り込み中… ${progress.done}/${progress.total}`
          : '写真を追加'}
      </Button>

      {(result || error) && (
        <div
          role="status"
          className="border-border-subtle absolute top-full right-0 z-20 mt-2 w-[320px] rounded-[10px] border bg-white p-4 shadow-lg"
        >
          {error && (
            <p className="text-danger flex items-start gap-2 text-[13px]">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              {error}
            </p>
          )}
          {result && result.created.length > 0 && (
            <p className="text-success text-[13px] font-bold">
              {result.created.length}枚を取り込みました
            </p>
          )}
          {result && result.skipped.length > 0 && (
            <div className="mt-2">
              <p className="text-ink-muted text-[12px]">
                {result.skipped.length}枚は取り込めませんでした
              </p>
              <ul className="mt-1 max-h-[140px] space-y-1 overflow-y-auto">
                {result.skipped.map((s) => (
                  <li key={s.filename} className="text-ink-muted text-[11px]">
                    ・{s.filename}：{s.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button
            type="button"
            onClick={() => { setResult(null); setError(null); }}
            className="text-brand-link mt-3 text-[12px] hover:underline"
          >
            閉じる
          </button>
        </div>
      )}
    </div>
  );
}
