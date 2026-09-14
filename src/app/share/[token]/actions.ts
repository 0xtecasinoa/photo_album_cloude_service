'use server';

import { cookies } from 'next/headers';
import { resolveShareLink, verifySharePassword } from '@/lib/queries/share-links';
import { shareCookieName, shareCookieValue } from '@/lib/share/auth';
import { recordAudit } from '@/lib/audit';

export type SharePasswordState = { error?: string };

export async function submitSharePasswordAction(
  _prev: SharePasswordState,
  formData: FormData,
): Promise<SharePasswordState> {
  const token = String(formData.get('token') ?? '');
  const password = String(formData.get('password') ?? '');

  const link = await resolveShareLink(token);
  if (link.status !== 'ok' || !link.passwordHash) {
    return { error: 'このリンクは利用できません。' };
  }

  if (!(await verifySharePassword(link.passwordHash, password))) {
    // 失敗理由は分けない。総当たりに手がかりを与えないため。
    return { error: 'パスワードが違います。' };
  }

  const store = await cookies();
  store.set(shareCookieName(link.id), shareCookieValue(link.id, link.passwordHash), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    /*
     * パス制限はかけない。画像は /api/share/... から配信するため、
     * /share/<token> に絞ると Cookie が届かず写真が一枚も出なくなる。
     * Cookie 名にリンクIDが入っているので、他の共有リンクには使い回せない。
     */
    path: '/',
    maxAge: 60 * 60 * 12,
  });

  await recordAudit({
    organizationId: link.organizationId,
    action: 'share.accessed',
    targetType: 'share_link',
    targetId: link.id,
    targetLabel: link.name ?? token.slice(0, 8),
    projectId: link.projectId,
  });

  return {};
}
