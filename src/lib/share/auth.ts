import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * 共有リンクのパスワード認証。
 *
 * 閲覧者にはアカウントがないため、セッションではなく署名付き Cookie を使います。
 * Cookie にはリンクIDとパスワードハッシュから作った署名だけを入れ、
 * パスワードそのものは入れません。パスワードを変えると署名も変わるので、
 * 古い Cookie は自動的に無効になります。
 */

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error('AUTH_SECRET is required to sign share cookies');
  return value;
}

export function shareCookieName(linkId: string): string {
  return `share_${linkId}`;
}

export function shareCookieValue(linkId: string, passwordHash: string): string {
  return createHmac('sha256', secret()).update(`${linkId}:${passwordHash}`).digest('hex');
}

export function shareCookieMatches(
  value: string | undefined,
  linkId: string,
  passwordHash: string,
): boolean {
  if (!value) return false;
  const expected = shareCookieValue(linkId, passwordHash);
  // 長さが違うと timingSafeEqual が投げるため、先に見ておく。
  if (value.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}
