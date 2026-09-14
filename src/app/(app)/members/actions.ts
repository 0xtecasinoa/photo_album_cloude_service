'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireSession } from '@/lib/auth/session';
import { recordAudit } from '@/lib/audit';
import {
  inviteMember,
  changeMemberRole,
  setMemberActive,
  countActiveOwners,
  isOwner,
  EmailAlreadyUsedError,
  RoleNotFoundError,
} from '@/lib/queries/members';

export type InviteFormState = {
  error?: string;
  fieldErrors?: Partial<Record<'name' | 'email' | 'roleId', string>>;
  /** 招待に成功したときだけ入る。管理者が本人に渡すための URL。 */
  inviteUrl?: string;
  invitedEmail?: string;
};

const inviteSchema = z.object({
  name: z.string().trim().min(1, '氏名を入力してください。').max(120),
  email: z.string().trim().toLowerCase().email('メールアドレスの形式が正しくありません。'),
  roleId: z.string().uuid('権限を選択してください。'),
  department: z.string().trim().max(120).optional(),
});

/** 招待 URL の組み立て。リバースプロキシ配下でも正しいホストになるようヘッダーを見る。 */
async function originFromRequest(): Promise<string> {
  const h = await headers();
  const envOrigin = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  if (envOrigin) return envOrigin.replace(/\/$/, '');
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  return `${proto}://${host}`;
}

export async function inviteMemberAction(
  _prev: InviteFormState,
  formData: FormData,
): Promise<InviteFormState> {
  const { user, organization, capabilities } = await requireSession();

  if (!capabilities.has('member.invite')) {
    return { error: 'メンバーを招待する権限がありません。' };
  }

  const parsed = inviteSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    roleId: formData.get('roleId'),
    department: formData.get('department') || undefined,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const k = String(i.path[0] ?? '');
      if (k && !fieldErrors[k]) fieldErrors[k] = i.message;
    }
    return { fieldErrors };
  }

  try {
    const invite = await inviteMember({
      organizationId: organization.id,
      email: parsed.data.email,
      name: parsed.data.name,
      roleId: parsed.data.roleId,
      department: parsed.data.department ?? null,
    });

    await recordAudit({
      organizationId: organization.id,
      actorId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      action: 'member.invite',
      targetType: 'user',
      targetId: invite.userId,
      targetLabel: parsed.data.email,
      metadata: { roleId: parsed.data.roleId, expires: invite.expires.toISOString() },
    });

    revalidatePath('/members');
    return {
      inviteUrl: `${await originFromRequest()}/invite/${invite.token}`,
      invitedEmail: parsed.data.email,
    };
  } catch (error) {
    if (error instanceof EmailAlreadyUsedError) return { fieldErrors: { email: error.message } };
    if (error instanceof RoleNotFoundError) return { fieldErrors: { roleId: error.message } };
    console.error('[member.invite] failed', error);
    return { error: '招待に失敗しました。時間をおいて再度お試しください。' };
  }
}

export type MemberActionState = { error?: string; message?: string };

export async function changeMemberRoleAction(
  _prev: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const { user, organization, capabilities } = await requireSession();

  if (!capabilities.has('member.manage')) {
    return { error: '権限を変更する権限がありません。' };
  }

  const userId = String(formData.get('userId') ?? '');
  const roleId = String(formData.get('roleId') ?? '');
  if (!userId || !roleId) return { error: '対象が指定されていません。' };

  // 最後のオーナーを降格させると、誰も組織設定を触れなくなる。
  if (await isOwner(organization.id, userId)) {
    if ((await countActiveOwners(organization.id)) <= 1) {
      return { error: 'オーナーが1人だけのため、権限を変更できません。先に別のオーナーを指定してください。' };
    }
  }

  try {
    const changed = await changeMemberRole(organization.id, userId, roleId);
    if (!changed) return { error: '対象のメンバーが見つかりません。' };

    await recordAudit({
      organizationId: organization.id,
      actorId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      action: 'member.role_changed',
      targetType: 'user',
      targetId: userId,
      targetLabel: changed.email,
      metadata: { roleId, roleName: changed.roleName },
    });

    revalidatePath('/members');
    return { message: `${changed.name ?? changed.email} の権限を「${changed.roleName}」に変更しました。` };
  } catch (error) {
    if (error instanceof RoleNotFoundError) return { error: error.message };
    console.error('[member.role_changed] failed', error);
    return { error: '権限の変更に失敗しました。' };
  }
}

export async function setMemberActiveAction(
  _prev: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const { user, organization, capabilities } = await requireSession();

  const userId = String(formData.get('userId') ?? '');
  const nextActive = String(formData.get('isActive') ?? '') === 'true';
  if (!userId) return { error: '対象が指定されていません。' };

  if (!capabilities.has(nextActive ? 'member.manage' : 'member.remove')) {
    return { error: 'この操作を行う権限がありません。' };
  }

  if (userId === user.id) {
    return { error: '自分自身のアクセスは停止できません。' };
  }

  if (!nextActive && (await isOwner(organization.id, userId))) {
    if ((await countActiveOwners(organization.id)) <= 1) {
      return { error: '最後のオーナーのアクセスは停止できません。' };
    }
  }

  const row = await setMemberActive(organization.id, userId, nextActive);
  if (!row) return { error: '対象のメンバーが見つかりません。' };

  await recordAudit({
    organizationId: organization.id,
    actorId: user.id,
    actorName: user.name,
    actorEmail: user.email,
    action: 'member.remove',
    targetType: 'user',
    targetId: userId,
    targetLabel: row.email,
    metadata: { isActive: nextActive },
  });

  revalidatePath('/members');
  return {
    message: nextActive
      ? `${row.name ?? row.email} のアクセスを再開しました。`
      : `${row.name ?? row.email} のアクセスを停止しました。`,
  };
}
