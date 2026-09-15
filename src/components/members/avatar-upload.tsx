'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Loader2 } from 'lucide-react';

/**
 * 自分の顔写真を差し替える。
 *
 * 一覧で自分の行にだけ出します。他人の分を管理者が入れ替えられると、
 * 監査ログの「誰が」が信用できなくなるためです。
 */
export function AvatarUpload({ currentUrl, name }: { currentUrl: string | null; name: string }) {
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
      const res = await fetch('/api/profile/avatar', { method: 'POST', body });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error ?? `変更できませんでした（${res.status}）`);
        return;
      }
      router.refresh();
    } catch {
      setError('通信に失敗しました。');
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="relative inline-block">
      {/* eslint-disable-next-line @next/next/no-img-element -- 保存先から配信する画像 */}
      <img
        src={currentUrl || '/brand/avatar-placeholder.svg'}
        alt=""
        className="size-[52px] shrink-0 rounded-full object-cover"
      />
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label={`${name} の顔写真を変更`}
        title="顔写真を変更"
        className="bg-brand hover:bg-brand-hover absolute -right-1 -bottom-1 grid size-[22px] place-items-center rounded-full text-white transition-colors disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-3 animate-spin" aria-hidden /> : <Camera className="size-3" aria-hidden />}
      </button>
      {error && (
        <span role="alert" className="text-danger absolute top-full left-0 mt-1 block w-[180px] text-[11px]">
          {error}
        </span>
      )}
    </span>
  );
}
