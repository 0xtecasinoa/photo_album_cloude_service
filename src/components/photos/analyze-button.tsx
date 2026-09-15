'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * 未解析の写真の看板を読み取る。
 *
 * 取り込みと同時に走らせません。1枚あたり1.5秒ほどかかるため、
 * まとめて入れたときに取り込み自体が終わらなくなります。
 */
export function AnalyzeButton({
  projectId,
  pendingCount,
}: {
  projectId: string;
  pendingCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (pendingCount === 0) return null;

  async function run() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/analyze`, { method: 'POST' });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(payload.error ?? `読み取りに失敗しました（${res.status}）`);
        return;
      }
      if (payload.skipped > 0 && payload.analyzed === 0) {
        setMessage('文字認識の言語データが未設置のため、読み取りを行いませんでした。');
      } else {
        setMessage(`${payload.analyzed} 枚を読み取りました。`);
      }
      router.refresh();
    } catch {
      setMessage('通信に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" size="lg" disabled={busy} onClick={run}>
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
        {busy ? '読み取り中…' : `看板を読み取る（${pendingCount}枚）`}
      </Button>
      {message && <p role="status" className="text-ink-muted text-[11px]">{message}</p>}
    </div>
  );
}
