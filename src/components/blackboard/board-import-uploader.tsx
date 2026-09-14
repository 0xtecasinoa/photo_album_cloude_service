'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function BoardImportUploader() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/blackboard-imports', { method: 'POST', body });
      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(payload.error ?? `取り込みに失敗しました（${res.status}）`);
        return;
      }
      // 読み取り結果はそのまま採用せず、必ず確認画面へ送る。
      router.push(`/templates/import/${payload.importId}`);
    } catch {
      setError('通信に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
          e.target.value = '';
        }}
      />
      <Button variant="primary" size="lg" disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />}
        {busy ? '読み取り中…（数十秒かかります）' : '看板の写真を選ぶ'}
      </Button>
      {error && (
        <p role="alert" className="border-danger/40 bg-danger-tint text-danger mt-4 rounded-[8px] border px-4 py-3 text-[13px]">
          {error}
        </p>
      )}
    </div>
  );
}
