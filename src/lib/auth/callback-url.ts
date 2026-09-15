/** ログイン後の既定の遷移先。 */
export const DEFAULT_CALLBACK_URL = '/dashboard';

/** 相対パスを絶対 URL として解釈させるための土台。外部には出ません。 */
const INTERNAL_BASE = 'http://callback.invalid';

/**
 * ログイン後の遷移先を検証する。
 *
 * 第一の目的は、外部サイトへ飛ばされること（オープンリダイレクト）を防ぐことです。
 * 加えて、ルートとして成立しない文字列も弾きます。案内文からURLをコピーした際に
 * 全角の括弧などが末尾に混ざることがあり、そのまま通すと
 * 「ログインには成功しているのに404に着地する」状態になり、
 * 利用者にはログインできていないように見えるためです。
 *
 * 絞り込みのクエリには日本語が入りうる（工種など）ので、
 * 検査の対象はパス部分だけにしています。
 */
export function safeCallbackUrl(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_CALLBACK_URL;

  const value = raw.trim();
  if (!value.startsWith('/')) return DEFAULT_CALLBACK_URL;
  // "//" と "/\" はブラウザに外部サイトとして解釈される。
  if (value.startsWith('//') || value.startsWith('/\\')) return DEFAULT_CALLBACK_URL;

  let url: URL;
  try {
    url = new URL(value, INTERNAL_BASE);
  } catch {
    return DEFAULT_CALLBACK_URL;
  }

  // 相対パスとして解釈されなかったものは、行き先が外部になっている。
  if (url.origin !== INTERNAL_BASE) return DEFAULT_CALLBACK_URL;

  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(url.pathname);
  } catch {
    // 符号化が壊れている。
    return DEFAULT_CALLBACK_URL;
  }

  // このアプリのルートはすべて ASCII の印字可能文字。
  // 全角文字や制御文字が含まれるものは貼り付け事故として扱う。
  if (!/^[\x20-\x7E]*$/.test(decodedPath)) return DEFAULT_CALLBACK_URL;

  return url.pathname + url.search;
}
