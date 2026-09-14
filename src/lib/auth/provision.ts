import { and, eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from '@/db';
import { organizations, roles, users } from '@/db/schema';
import { SYSTEM_ROLES, type SystemRoleSlug } from '@/lib/acl/capabilities';

/**
 * 組織とユーザーの新規作成。
 *
 * サインアップとシード処理の両方から使います。ロールの作成漏れを防ぐため、
 * 組織を作る経路はここに一本化しています。
 */

export class EmailTakenError extends Error {
  constructor() {
    super('このメールアドレスは既に登録されています。');
    this.name = 'EmailTakenError';
  }
}

/** URL に使える組織キーを作る。日本語の会社名でも必ず何か返す。 */
export function slugify(name: string): string {
  const ascii = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  // 日本語のみの社名だと ascii が空になるため、その場合は乱数キーにする。
  return ascii || `org-${Math.random().toString(36).slice(2, 10)}`;
}

/** 組織に7つの既定ロールを作成する。既にあるものは飛ばす。 */
export async function ensureSystemRoles(organizationId: string): Promise<Record<SystemRoleSlug, string>> {
  const existing = await db
    .select({ id: roles.id, slug: roles.slug })
    .from(roles)
    .where(eq(roles.organizationId, organizationId));

  const bySlug = new Map(existing.filter((r) => r.slug).map((r) => [r.slug!, r.id]));
  const created: Record<string, string> = Object.fromEntries(bySlug);

  for (const preset of Object.values(SYSTEM_ROLES)) {
    if (bySlug.has(preset.slug)) continue;
    const [row] = await db
      .insert(roles)
      .values({
        organizationId,
        slug: preset.slug,
        name: preset.nameJa,
        description: preset.descriptionJa,
        capabilities: [...preset.capabilities],
        isSystem: true,
      })
      .returning({ id: roles.id });
    created[preset.slug] = row!.id;
  }

  return created as Record<SystemRoleSlug, string>;
}

export type SignUpInput = {
  name: string;
  email: string;
  password: string;
  /** 会社名。未入力なら氏名から仮の名称を作る。 */
  companyName?: string;
};

export type SignUpResult = { userId: string; organizationId: string };

/**
 * 新規登録。組織・既定ロール・オーナーユーザーをまとめて作成する。
 *
 * 途中で失敗した場合に組織だけが残らないよう、トランザクションで囲っている。
 */
export async function signUp(input: SignUpInput): Promise<SignUpResult> {
  const email = input.email.trim().toLowerCase();

  const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (taken) throw new EmailTakenError();

  const passwordHash = await bcrypt.hash(input.password, 12);
  const companyName = input.companyName?.trim() || `${input.name.trim()} の組織`;

  return db.transaction(async (tx) => {
    const [org] = await tx
      .insert(organizations)
      .values({ name: companyName, slug: slugify(companyName), plan: 'trial' })
      .returning({ id: organizations.id });

    const organizationId = org!.id;

    // ensureSystemRoles はトランザクション外の db を使うため、ここでは直接挿入する。
    const roleRows = await tx
      .insert(roles)
      .values(
        Object.values(SYSTEM_ROLES).map((preset) => ({
          organizationId,
          slug: preset.slug,
          name: preset.nameJa,
          description: preset.descriptionJa,
          capabilities: [...preset.capabilities],
          isSystem: true,
        })),
      )
      .returning({ id: roles.id, slug: roles.slug });

    const ownerRoleId = roleRows.find((r) => r.slug === 'owner')!.id;

    const [user] = await tx
      .insert(users)
      .values({
        name: input.name.trim(),
        email,
        passwordHash,
        organizationId,
        defaultRoleId: ownerRoleId,
        emailVerified: null,
      })
      .returning({ id: users.id });

    return { userId: user!.id, organizationId };
  });
}

/**
 * Google などの外部ログインで初回サインインしたユーザーに、組織と
 * オーナーロールを割り当てる。Auth.js のアダプタは users 行しか作らないため。
 */
export async function ensureOrganizationForUser(userId: string, displayName?: string | null): Promise<string> {
  const [user] = await db
    .select({ id: users.id, organizationId: users.organizationId, defaultRoleId: users.defaultRoleId, name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) throw new Error(`user not found: ${userId}`);
  if (user.organizationId && user.defaultRoleId) return user.organizationId;

  const label = displayName ?? user.name ?? 'マイ組織';
  const companyName = `${label} の組織`;

  const [org] = await db
    .insert(organizations)
    .values({ name: companyName, slug: slugify(companyName), plan: 'trial' })
    .returning({ id: organizations.id });

  const roleIds = await ensureSystemRoles(org!.id);

  await db
    .update(users)
    .set({ organizationId: org!.id, defaultRoleId: roleIds.owner })
    .where(eq(users.id, userId));

  return org!.id;
}

/** 既定ロールの id を slug から引く。 */
export async function findRoleId(organizationId: string, slug: SystemRoleSlug): Promise<string | null> {
  const [row] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(and(eq(roles.organizationId, organizationId), eq(roles.slug, slug)))
    .limit(1);
  return row?.id ?? null;
}
