import { headers } from 'next/headers';
import { db } from '@/db';
import { accessLogs } from '@/db/schema';
import { getSessionContext } from '@/lib/auth/session';

/**
 * 画面の閲覧を記録する。
 *
 * 応答を返したあとに実行します（next/server の after）。記録のために
 * 画面表示を待たせると、全ページが遅くなるためです。
 * 失敗しても画面には影響させません。記録が取れないことより、
 * 画面が開かないことのほうが困るためです。
 */

/** 画面の大分類。どの機能がよく使われているかを見るのに使う。 */
export function sectionOf(path: string): string {
  if (path === '/' || path === '') return 'トップ';
  if (path.startsWith('/dashboard')) return 'ダッシュボード';
  if (path.startsWith('/projects')) {
    if (path.includes('/ledger')) return '写真台帳';
    if (path.includes('/export')) return '出力';
    return '現場・写真';
  }
  if (path.startsWith('/templates')) return '電子小黒板';
  if (path.startsWith('/members')) return 'メンバー';
  if (path.startsWith('/settings')) return '設定・プラン';
  if (path.startsWith('/notifications')) return '通知';
  if (path.startsWith('/admin')) return '運営管理';
  if (path.startsWith('/login') || path.startsWith('/signup') || path.startsWith('/invite')) return '認証';
  if (path.startsWith('/share')) return '共有リンク';
  return 'その他';
}

/** 端末の種類。台数ではなく傾向を見るためのざっくりした判定。 */
export function deviceOf(userAgent: string | null): string {
  if (!userAgent) return '不明';
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet/.test(ua)) return 'タブレット';
  if (/iphone|android.*mobile|windows phone/.test(ua)) return 'スマートフォン';
  if (/android/.test(ua)) return 'タブレット';
  return 'パソコン';
}

export type AccessContext = {
  path: string;
  referrer: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  userId: string | null;
  organizationId: string | null;
  userEmail: string | null;
  userName: string | null;
  organizationName: string | null;
};

/**
 * 記録に必要な値を、描画中に読み出しておく。
 *
 * after() の中では headers() を呼べません（要求の情報はその時点で
 * もう手に入らない）。先に読んで、値だけを持ち越します。
 */
export async function collectAccessContext(): Promise<AccessContext | null> {
  const h = await headers();
  const path = h.get('x-pathname') ?? h.get('x-invoke-path') ?? h.get('x-matched-path');
  if (!path) return null;

  const ctx = await getSessionContext();
  const forwarded = h.get('x-forwarded-for');

  return {
    path,
    referrer: h.get('referer'),
    ipAddress: forwarded ? forwarded.split(',')[0]!.trim() : h.get('x-real-ip'),
    userAgent: h.get('user-agent'),
    userId: ctx?.user.id ?? null,
    organizationId: ctx?.organization.id ?? null,
    userEmail: ctx?.user.email ?? null,
    userName: ctx?.user.name ?? null,
    organizationName: ctx?.organization.name ?? null,
  };
}

export async function recordAccess(access: AccessContext): Promise<void> {
  try {
    await db.insert(accessLogs).values({
      userId: access.userId,
      organizationId: access.organizationId,
      userEmail: access.userEmail,
      userName: access.userName,
      organizationName: access.organizationName,
      path: access.path,
      section: sectionOf(access.path),
      referrer: access.referrer,
      ipAddress: access.ipAddress,
      userAgent: access.userAgent,
      device: deviceOf(access.userAgent),
    });
  } catch (error) {
    // 記録が取れないことより、画面が開かないことのほうが困る。
    console.error('[access-log] failed to record', error);
  }
}
