import Image from 'next/image';
import { oauthSignInAction } from '@/app/(auth)/actions';
import { googleEnabled } from '@/auth';

/**
 * Google サインイン。
 *
 * GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET が未設定のときは何も描画しません。
 * 押しても必ず失敗するボタンを見せるより、出さないほうが親切なためです。
 */
export function GoogleButton({ label, callbackUrl = '/dashboard' }: { label: string; callbackUrl?: string }) {
  if (!googleEnabled) return null;

  return (
    <>
      <p className="text-ink-muted my-6 text-center text-[13px]">または</p>
      <form action={oauthSignInAction}>
        <input type="hidden" name="provider" value="google" />
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <button
          type="submit"
          className="border-border hover:bg-surface-muted flex h-[57px] w-full items-center justify-center gap-3 rounded-[10px] border bg-white text-[15px] font-bold text-ink transition-colors"
        >
          <Image src="/brand/google.png" alt="" width={24} height={21} className="h-[21px] w-6" />
          {label}
        </button>
      </form>
    </>
  );
}
