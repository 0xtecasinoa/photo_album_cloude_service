import { cache } from 'react';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { organizations, roles, users } from '@/db/schema';
import { auth } from '@/auth';
import type { Capability } from '@/lib/acl/capabilities';

export type SessionContext = {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    roleLabel: string;
  };
  organization: {
    id: string;
    name: string;
    storageUsedBytes: number;
    storageQuotaBytes: number;
    plan: string;
  };
  capabilities: Set<Capability>;
};

/**
 * 現在ログイン中のユーザーと所属組織。
 *
 * React の cache で包んでいるため、同じリクエスト中に何度呼んでも
 * データベースへの問い合わせは1回で済む（レイアウトと各ページの両方から呼ぶため）。
 */
export const getSessionContext = cache(async (): Promise<SessionContext | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [row] = await db
    .select({
      userId: users.id,
      userName: users.name,
      userEmail: users.email,
      userImage: users.image,
      isActive: users.isActive,
      orgId: organizations.id,
      orgName: organizations.name,
      storageUsedBytes: organizations.storageUsedBytes,
      storageQuotaBytes: organizations.storageQuotaBytes,
      plan: organizations.plan,
      roleName: roles.name,
      capabilities: roles.capabilities,
    })
    .from(users)
    .innerJoin(organizations, eq(organizations.id, users.organizationId))
    .leftJoin(roles, eq(roles.id, users.defaultRoleId))
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!row || !row.isActive) return null;

  return {
    user: {
      id: row.userId,
      name: row.userName ?? row.userEmail,
      email: row.userEmail,
      image: row.userImage,
      roleLabel: row.roleName ?? 'メンバー',
    },
    organization: {
      id: row.orgId,
      name: row.orgName,
      storageUsedBytes: row.storageUsedBytes,
      storageQuotaBytes: row.storageQuotaBytes,
      plan: row.plan,
    },
    capabilities: new Set(row.capabilities ?? []),
  };
});

/** ログイン必須のページ用。未ログインならログイン画面へ送る。 */
export async function requireSession(returnTo?: string): Promise<SessionContext> {
  const ctx = await getSessionContext();
  if (!ctx) {
    const qs = returnTo ? `?callbackUrl=${encodeURIComponent(returnTo)}` : '';
    redirect(`/login${qs}`);
  }
  return ctx;
}
