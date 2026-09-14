'use server';

import { revalidatePath } from 'next/cache';
import { requirePlatformAdmin } from '@/lib/auth/admin';
import { recordAudit } from '@/lib/audit';
import {
  setInquiryStatus,
  setOrganizationActive,
  setUserActive,
} from '@/lib/queries/admin';
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
