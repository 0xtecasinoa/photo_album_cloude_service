import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getSessionContext } from '@/lib/auth/session';

/**
 * アクセスログを見られる唯一のアカウント。
 *
 * 運営管理者（is_platform_admin）であっても、このアドレス以外は見られません。
 * 利用者一人ひとりの行動が分かる記録なので、「運営だから見てよい」の範囲を
 * 超えていると考え、権限ではなくアドレスで固定しています。
 *
 * 環境変数で差し替えられるようにしてあるのは、引き継ぎのためです。
 * 値を変えない限り、データベースを直接書き換えても閲覧者は増えません。
 */
export const ACCESS_LOG_VIEWER_EMAIL = (
  process.env.ACCESS_LOG_VIEWER_EMAIL ?? 'ten.dev1024@gmail.com'
).trim().toLowerCase();

/** このセッションがアクセスログを見てよいか。 */
export async function isAccessLogViewer(): Promise<boolean> {
  const ctx = await getSessionContext();
  if (!ctx) return false;
  return ctx.user.email.trim().toLowerCase() === ACCESS_LOG_VIEWER_EMAIL;
}

/**
 * アクセスログ画面の門番。
 *
 * 未ログインならログイン画面へ、そうでなければ 404 を返します。
 * 「権限がありません」と出すと、運営管理者にこの画面の存在を
 * 知らせることになるためです。
 */
export async function requireAccessLogViewer(returnTo = '/admin/access-logs') {
  const ctx = await getSessionContext();
  if (ctx && ctx.user.email.trim().toLowerCase() === ACCESS_LOG_VIEWER_EMAIL) return ctx;

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(returnTo)}`);
  }
  notFound();
}
