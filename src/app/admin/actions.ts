'use server';

import { revalidatePath } from 'next/cache';
import { requirePlatformAdmin } from '@/lib/auth/admin';
import { recordAudit } from '@/lib/audit';
import {
  setInquiryStatus,
  setOrganizationActive,
  setUserActive,
  saveInquiryResponse,
  issuePasswordReset,
} from '@/lib/queries/admin';
import { createNotice, softDeleteNotice } from '@/lib/queries/notifications';
import { headers } from 'next/headers';
import { z } from 'zod';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export type AdminActionState = { error?: string; message?: string; at?: number };

const INQUIRY_STATUSES = new Set(['new', 'in_progress', 'closed']);

export async function setInquiryStatusAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requirePlatformAdmin();

  const inquiryId = String(formData.get('inquiryId') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!inquiryId || !INQUIRY_STATUSES.has(status)) {
    return { at: Date.now(), error: '不正な指定です。' };
  }

  const row = await setInquiryStatus(inquiryId, status);
  if (!row) return { at: Date.now(), error: 'お問い合わせが見つかりません。' };

  revalidatePath('/admin/inquiries');
  return { at: Date.now(), message: `「${row.company}」の対応状況を更新しました。` };
}

export async function setOrganizationActiveAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requirePlatformAdmin();

  const organizationId = String(formData.get('organizationId') ?? '');
  const isActive = String(formData.get('isActive') ?? '') === 'true';
  if (!organizationId) return { at: Date.now(), error: '対象が指定されていません。' };

  const row = await setOrganizationActive(organizationId, isActive);
  if (!row) return { at: Date.now(), error: '会社が見つかりません。' };

  /*
   * 監査ログはその会社のテナントに残す。運営が止めたことを、
   * あとからその会社側でも確認できるようにするため。
   */
  await recordAudit({
    organizationId,
    actorId: admin.id,
    actorName: `${admin.name}（運営）`,
    actorEmail: admin.email,
    action: 'org.settings_changed',
    targetType: 'organization',
    targetId: organizationId,
    targetLabel: row.name,
    metadata: { change: isActive ? 'reactivated_by_platform' : 'suspended_by_platform' },
  });

  revalidatePath('/admin/organizations');
  revalidatePath('/admin');
  return {
    at: Date.now(),
    message: isActive ? `「${row.name}」を再開しました。` : `「${row.name}」を停止しました。`,
  };
}

export async function setUserActiveAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requirePlatformAdmin();

  const userId = String(formData.get('userId') ?? '');
  const isActive = String(formData.get('isActive') ?? '') === 'true';
  if (!userId) return { at: Date.now(), error: '対象が指定されていません。' };

  if (userId === admin.id) {
    return { at: Date.now(), error: '自分自身のアクセスは停止できません。' };
  }

  // 監査ログに会社を残すため、更新の前に所属を控える。
  const [before] = await db
    .select({ organizationId: users.organizationId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const row = await setUserActive(userId, isActive);
  if (!row) {
    return { at: Date.now(), error: '対象が見つからないか、運営管理者のため変更できません。' };
  }

  if (before) {
    await recordAudit({
      organizationId: before.organizationId,
      actorId: admin.id,
      actorName: `${admin.name}（運営）`,
      actorEmail: admin.email,
      action: 'member.remove',
      targetType: 'user',
      targetId: userId,
      targetLabel: row.email,
      metadata: { isActive, by: 'platform_admin' },
    });
  }

  revalidatePath('/admin/users');
  revalidatePath('/admin');
  return {
    at: Date.now(),
    message: isActive
      ? `${row.name ?? row.email} のアクセスを再開しました。`
      : `${row.name ?? row.email} のアクセスを停止しました。`,
  };
}

/* ---------- 問い合わせへの回答 ---------- */

export async function saveInquiryResponseAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requirePlatformAdmin();

  const inquiryId = String(formData.get('inquiryId') ?? '');
  const response = String(formData.get('response') ?? '').trim();
  if (!inquiryId) return { at: Date.now(), error: '対象が指定されていません。' };
  if (!response) return { at: Date.now(), error: '回答内容を入力してください。' };
  if (response.length > 4000) return { at: Date.now(), error: '回答は4000文字以内で入力してください。' };

  const row = await saveInquiryResponse(inquiryId, response, admin.id);
  if (!row) return { at: Date.now(), error: 'お問い合わせが見つかりません。' };

  revalidatePath('/admin/inquiries');
  return { at: Date.now(), message: `「${row.company}」への回答を保存しました。` };
}

/* ---------- パスワード再設定 ---------- */

export type ResetLinkState = AdminActionState & { resetUrl?: string; resetEmail?: string };

async function originFromRequest(): Promise<string> {
  const h = await headers();
  const envOrigin = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  if (envOrigin) return envOrigin.replace(/\/$/, '');
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  return `${proto}://${host}`;
}

export async function issuePasswordResetAction(
  _prev: ResetLinkState,
  formData: FormData,
): Promise<ResetLinkState> {
  const admin = await requirePlatformAdmin();

  const userId = String(formData.get('userId') ?? '');
  if (!userId) return { at: Date.now(), error: '対象が指定されていません。' };

  const issued = await issuePasswordReset(userId);
  if (!issued) {
    return { at: Date.now(), error: '対象が見つからないか、運営管理者のため発行できません。' };
  }

  const [target] = await db
    .select({ organizationId: users.organizationId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (target) {
    await recordAudit({
      organizationId: target.organizationId,
      actorId: admin.id,
      actorName: `${admin.name}（運営）`,
      actorEmail: admin.email,
      action: 'member.invite',
      targetType: 'user',
      targetId: userId,
      targetLabel: issued.email,
      metadata: { change: 'password_reset_issued', expires: issued.expires.toISOString() },
    });
  }

  return {
    at: Date.now(),
    resetUrl: `${await originFromRequest()}/invite/${issued.token}`,
    resetEmail: issued.email,
  };
}

/* ---------- お知らせの配信 ---------- */

const noticeSchema = z.object({
  organizationId: z.string().uuid().nullable(),
  level: z.enum(['info', 'warning', 'critical']),
  title: z.string().trim().min(1, '件名を入力してください。').max(200),
  body: z.string().trim().max(4000).nullable(),
  linkUrl: z.string().trim().max(500).nullable(),
  expiresInDays: z.number().int().min(1).max(365).nullable(),
});

export async function createNoticeAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await requirePlatformAdmin();

  const rawDays = String(formData.get('expiresInDays') ?? '').trim();
  const parsed = noticeSchema.safeParse({
    organizationId: (formData.get('organizationId') as string) || null,
    level: (formData.get('level') as string) || 'info',
    title: formData.get('title'),
    body: (formData.get('body') as string) || null,
    linkUrl: (formData.get('linkUrl') as string) || null,
    expiresInDays: rawDays ? Number(rawDays) : null,
  });

  if (!parsed.success) {
    return { at: Date.now(), error: parsed.error.issues[0]?.message ?? '入力内容を確認してください。' };
  }

  await createNotice({
    organizationId: parsed.data.organizationId,
    level: parsed.data.level,
    title: parsed.data.title,
    body: parsed.data.body,
    linkUrl: parsed.data.linkUrl,
    expiresAt: parsed.data.expiresInDays
      ? new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000)
      : null,
    createdById: admin.id,
  });

  revalidatePath('/admin/notifications');
  return {
    at: Date.now(),
    message: parsed.data.organizationId
      ? 'お知らせを配信しました（指定した会社のみ）。'
      : 'お知らせを配信しました（全社）。',
  };
}

export async function deleteNoticeAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requirePlatformAdmin();

  const noticeId = String(formData.get('noticeId') ?? '');
  if (!noticeId) return { at: Date.now(), error: '対象が指定されていません。' };

  const row = await softDeleteNotice(noticeId);
  if (!row) return { at: Date.now(), error: 'お知らせが見つかりません。' };

  revalidatePath('/admin/notifications');
  return { at: Date.now(), message: `「${row.title}」を取り下げました。` };
}
