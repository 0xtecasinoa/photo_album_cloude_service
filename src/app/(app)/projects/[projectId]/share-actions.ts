'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireSession } from '@/lib/auth/session';
import { capabilitiesForProject, getProject } from '@/lib/queries/projects';
import { createShareLink, revokeShareLink } from '@/lib/queries/share-links';
import { recordAudit } from '@/lib/audit';

export type ShareFormState = {
  error?: string;
  message?: string;
  /** 発行できたときだけ入る。画面で渡す URL。 */
  shareUrl?: string;
  at?: number;
};

const createSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().trim().max(120).nullable(),
  password: z.string().trim().min(4, 'パスワードは4文字以上で入力してください。').max(200).nullable(),
  allowDownload: z.boolean(),
  expiresInDays: z.number().int().min(1).max(365).nullable(),
  maxViews: z.number().int().min(1).max(10000).nullable(),
});

async function originFromRequest(): Promise<string> {
  const h = await headers();
  const envOrigin = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  if (envOrigin) return envOrigin.replace(/\/$/, '');
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  return `${proto}://${host}`;
}

function optionalNumber(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export async function createShareLinkAction(
  _prev: ShareFormState,
  formData: FormData,
): Promise<ShareFormState> {
  const { user, organization } = await requireSession();
  const projectId = String(formData.get('projectId') ?? '');

  // 現場が自組織のものかを先に確かめる。権限は現場単位で決まるため。
  const project = await getProject(organization.id, projectId);
  if (!project) return { at: Date.now(), error: '現場が見つかりません。' };

  const capabilities = await capabilitiesForProject(user.id, projectId);
  if (!capabilities.has('share.create')) {
    return { at: Date.now(), error: '共有リンクを発行する権限がありません。' };
  }

  const parsed = createSchema.safeParse({
    projectId,
    name: (formData.get('name') as string) || null,
    password: (formData.get('password') as string) || null,
    allowDownload: formData.get('allowDownload') === 'on',
    expiresInDays: optionalNumber(formData.get('expiresInDays')),
    maxViews: optionalNumber(formData.get('maxViews')),
  });

  if (!parsed.success) {
    return { at: Date.now(), error: parsed.error.issues[0]?.message ?? '入力内容を確認してください。' };
  }

  /*
   * ダウンロードを許すリンクにはパスワードを必須にする。
   * 原本を配れるリンクが URL だけで開けると、転送された時点で
   * 誰でも成果品の元データを持ち出せてしまう。
   */
  if (parsed.data.allowDownload && !parsed.data.password) {
    return {
      at: Date.now(),
      error: 'ダウンロードを許可する場合は、パスワードを設定してください。',
    };
  }

  try {
    const { token } = await createShareLink({
      organizationId: organization.id,
      projectId,
      createdById: user.id,
      name: parsed.data.name,
      password: parsed.data.password,
      allowDownload: parsed.data.allowDownload,
      expiresInDays: parsed.data.expiresInDays,
      maxViews: parsed.data.maxViews,
    });

    await recordAudit({
      organizationId: organization.id,
      actorId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      action: 'share.create',
      targetType: 'project',
      targetId: projectId,
      targetLabel: project.name,
      projectId,
      metadata: {
        allowDownload: parsed.data.allowDownload,
        hasPassword: Boolean(parsed.data.password),
        expiresInDays: parsed.data.expiresInDays,
        maxViews: parsed.data.maxViews,
      },
    });

    revalidatePath(`/projects/${projectId}`);
    return { at: Date.now(), shareUrl: `${await originFromRequest()}/share/${token}` };
  } catch (error) {
    console.error('[share.create] failed', error);
    return { at: Date.now(), error: '共有リンクの発行に失敗しました。' };
  }
}

export async function revokeShareLinkAction(
  _prev: ShareFormState,
  formData: FormData,
): Promise<ShareFormState> {
  const { user, organization } = await requireSession();
  const projectId = String(formData.get('projectId') ?? '');
  const shareLinkId = String(formData.get('shareLinkId') ?? '');

  const capabilities = await capabilitiesForProject(user.id, projectId);
  if (!capabilities.has('share.revoke')) {
    return { at: Date.now(), error: '共有リンクを取り消す権限がありません。' };
  }

  const revoked = await revokeShareLink(organization.id, shareLinkId);
  if (!revoked) return { at: Date.now(), error: '共有リンクが見つかりません。' };

  await recordAudit({
    organizationId: organization.id,
    actorId: user.id,
    actorName: user.name,
    actorEmail: user.email,
    action: 'share.revoke',
    targetType: 'share_link',
    targetId: revoked.id,
    targetLabel: revoked.name ?? '共有リンク',
    projectId,
  });

  revalidatePath(`/projects/${projectId}`);
  return { at: Date.now(), message: '共有リンクを取り消しました。以降は開けなくなります。' };
}
