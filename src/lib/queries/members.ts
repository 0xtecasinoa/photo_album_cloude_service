import { randomBytes } from 'node:crypto';
import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { roles, users, verificationTokens, projectMembers } from '@/db/schema';
import type { Capability } from '@/lib/acl/capabilities';

export type MemberListItem = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  department: string | null;
  jobTitle: string | null;
  roleId: string | null;
  roleName: string | null;
  roleSlug: string | null;
  isActive: boolean;
  /** パスワード未設定＝招待リンクをまだ開いていない。 */
  pending: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
};

export type OrgRole = {
  id: string;
  slug: string | null;
  name: string;
  description: string | null;
  capabilities: Capability[];
  isSystem: boolean;
  memberCount: number;
};

export async function listMembers(organizationId: string): Promise<MemberListItem[]> {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      department: users.department,
      jobTitle: users.jobTitle,
      roleId: users.defaultRoleId,
      roleName: roles.name,
      roleSlug: roles.slug,
      isActive: users.isActive,
      hasPassword: sql<boolean>`(${users.passwordHash} is not null)`,
      emailVerified: users.emailVerified,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(roles, eq(roles.id, users.defaultRoleId))
    .where(eq(users.organizationId, organizationId))
    .orderBy(asc(users.createdAt));

  return rows.map(({ hasPassword, emailVerified, ...r }) => ({
    ...r,
    // Google ログインのみのユーザーはパスワードを持たないので、
    // emailVerified が入っていれば「招待中」とは見なさない。
    pending: !hasPassword && !emailVerified,
  }));
}

export async function listOrgRoles(organizationId: string): Promise<OrgRole[]> {
  const rows = await db
    .select({
      id: roles.id,
      slug: roles.slug,
      name: roles.name,
      description: roles.description,
      capabilities: roles.capabilities,
      isSystem: roles.isSystem,
      memberCount: sql<number>`count(${users.id})::int`,
    })
    .from(roles)
    .leftJoin(users, eq(users.defaultRoleId, roles.id))
    .where(eq(roles.organizationId, organizationId))
    .groupBy(roles.id)
    .orderBy(asc(roles.createdAt));

  return rows;
}

export class EmailAlreadyUsedError extends Error {
  constructor() {
    super('このメールアドレスは既に登録されています。');
    this.name = 'EmailAlreadyUsedError';
  }
}

export class RoleNotFoundError extends Error {
  constructor() {
    super('指定された権限が見つかりません。');
    this.name = 'RoleNotFoundError';
  }
}

export type InviteResult = { userId: string; token: string; expires: Date };

/**
 * メンバーを招待する。
 *
 * SMTP を前提にしないため、ここではユーザー行と招待トークンを作るところまで行い、
 * 招待 URL は画面に表示して管理者に渡してもらう。パスワードは招待された本人が
 * /invite/[token] で設定するので、管理者が他人のパスワードを知ることはない。
 */
export async function inviteMember(input: {
  organizationId: string;
  email: string;
  name: string;
  roleId: string;
  department?: string | null;
}): Promise<InviteResult> {
  const email = input.email.trim().toLowerCase();

  // メールアドレスは全社横断で一意。別の組織で使われている場合も含めて弾く。
  const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (taken) throw new EmailAlreadyUsedError();

  // ロールが本当に自組織のものか確認する。他社のロール id を送られても効かないように。
  const [role] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(and(eq(roles.id, input.roleId), eq(roles.organizationId, input.organizationId)))
    .limit(1);
  if (!role) throw new RoleNotFoundError();

  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        name: input.name.trim(),
        email,
        organizationId: input.organizationId,
        defaultRoleId: role.id,
        department: input.department || null,
        passwordHash: null,
        isActive: true,
      })
      .returning({ id: users.id });

    await tx.insert(verificationTokens).values({ identifier: `invite:${email}`, token, expires });

    return { userId: user!.id, token, expires };
  });
}

/** 組織内のメンバーであることを確認したうえでロールを差し替える。 */
export async function changeMemberRole(
  organizationId: string,
  userId: string,
  roleId: string,
): Promise<{ name: string | null; email: string; roleName: string } | null> {
  const [role] = await db
    .select({ id: roles.id, name: roles.name })
    .from(roles)
    .where(and(eq(roles.id, roleId), eq(roles.organizationId, organizationId)))
    .limit(1);
  if (!role) throw new RoleNotFoundError();

  const [row] = await db
    .update(users)
    .set({ defaultRoleId: role.id, updatedAt: new Date() })
    .where(and(eq(users.id, userId), eq(users.organizationId, organizationId)))
    .returning({ name: users.name, email: users.email });

  return row ? { ...row, roleName: role.name } : null;
}

/**
 * アクセスの停止・再開。
 *
 * 行は消さない。写真の撮影者や監査ログの実行者として参照されており、
 * 物理削除すると「誰が撮ったか分からない台帳」が出来てしまうため。
 */
export async function setMemberActive(
  organizationId: string,
  userId: string,
  isActive: boolean,
): Promise<{ name: string | null; email: string } | null> {
  const [row] = await db
    .update(users)
    .set({ isActive, updatedAt: new Date() })
    .where(and(eq(users.id, userId), eq(users.organizationId, organizationId)))
    .returning({ name: users.name, email: users.email });

  if (row && !isActive) {
    // 停止したら現場メンバーからも外す。復帰時は改めて招待し直す。
    await db.delete(projectMembers).where(eq(projectMembers.userId, userId));
  }

  return row ?? null;
}

/** 組織のオーナー数。最後のオーナーを降格・停止させないために使う。 */
export async function countActiveOwners(organizationId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(users)
    .innerJoin(roles, eq(roles.id, users.defaultRoleId))
    .where(
      and(eq(users.organizationId, organizationId), eq(roles.slug, 'owner'), eq(users.isActive, true)),
    );
  return row?.n ?? 0;
}

export async function isOwner(organizationId: string, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ slug: roles.slug })
    .from(users)
    .leftJoin(roles, eq(roles.id, users.defaultRoleId))
    .where(and(eq(users.id, userId), eq(users.organizationId, organizationId)))
    .limit(1);
  return row?.slug === 'owner';
}

export type InviteLookup = {
  token: string;
  email: string;
  userId: string;
  userName: string | null;
  organizationName: string;
  expires: Date;
};

/** 招待トークンからユーザーを引く。期限切れ・使用済みなら null。 */
export async function findInvite(token: string): Promise<InviteLookup | null> {
  const [row] = await db
    .select({ identifier: verificationTokens.identifier, expires: verificationTokens.expires })
    .from(verificationTokens)
    .where(eq(verificationTokens.token, token))
    .limit(1);

  if (!row || !row.identifier.startsWith('invite:')) return null;
  if (row.expires.getTime() < Date.now()) return null;

  const email = row.identifier.slice('invite:'.length);
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      organizationName: sql<string>`(select name from organizations where id = ${users.organizationId})`,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) return null;

  return {
    token,
    email: user.email,
    userId: user.id,
    userName: user.name,
    organizationName: user.organizationName,
    expires: row.expires,
  };
}

/** 招待を受ける。パスワードを設定し、トークンを使い捨てる。 */
export async function acceptInvite(token: string, passwordHash: string): Promise<boolean> {
  const invite = await findInvite(token);
  if (!invite) return false;

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ passwordHash, emailVerified: new Date(), updatedAt: new Date() })
      .where(eq(users.id, invite.userId));
    await tx.delete(verificationTokens).where(eq(verificationTokens.token, token));
  });

  return true;
}
