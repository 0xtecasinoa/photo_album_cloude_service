import type { Metadata } from 'next';
import Link from 'next/link';
import { KeyRound, ArrowLeft } from 'lucide-react';

export const metadata: Metadata = { title: 'パスワードをお忘れの方' };

/**
 * パスワード再設定の案内。
 *
 * ここでメールを送る自動再設定は用意していません。メール送信の設定がない状態で
 * 「再設定リンクを画面に出す」形にすると、メールアドレスを知っているだけで
 * 誰でも他人のパスワードを変えられてしまうためです。
 *
 * 代わりに、社内の管理者（メンバー画面）または運営が再設定リンクを
 * 発行する導線を案内します。
 */
export default function ForgotPasswordPage() {
  return (
    <>
      <div className="bg-brand-tint text-brand mb-7 grid size-14 place-items-center rounded-full">
        <KeyRound className="size-7" strokeWidth={1.7} aria-hidden />
      </div>

      <h1 className="text-brand text-[32px] font-bold">パスワードをお忘れの方</h1>

      <p className="text-ink-muted mt-6 text-[14px] leading-[2]">
        お手数ですが、社内の管理者にパスワードの再設定をご依頼ください。
        管理者が再設定用のリンクを発行できます。
      </p>

      <div className="border-border-subtle bg-surface-muted mt-8 rounded-[10px] border px-6 py-5">
        <h2 className="text-[13px] font-bold text-ink">管理者の方へ</h2>
        <p className="text-ink-muted mt-2.5 text-[13px] leading-[1.9]">
          「メンバー・権限」画面から対象の方を招待し直すか、
          運営にご連絡ください。再設定用のリンクをお渡しします。
        </p>
      </div>

      <p className="text-ink-muted mt-6 text-[12px] leading-[1.9]">
        ご不明な場合は
        <Link href="/contact" className="text-brand-link mx-1 underline">
          お問い合わせフォーム
        </Link>
        からご連絡ください。
      </p>

      <Link
        href="/login"
        className="text-accent mt-10 inline-flex items-center gap-1.5 text-[14px] font-bold hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        ログイン画面に戻る
      </Link>
    </>
  );
}
