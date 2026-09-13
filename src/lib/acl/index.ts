import { and, eq, isNull, or, gt } from 'drizzle-orm';
import { db } from '@/db';
import { projectMembers, projects, roles, users } from '@/db/schema';
import type { Capability } from './capabilities';

export * from './capabilities';

export class ForbiddenError extends Error {
  constructor(public readonly capability: Capability | null, message?: string) {
    super(message ?? 'この操作を行う権限がありません。');
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  constructor(message = 'お探しのデータは見つかりませんでした。') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export type AccessContext = {
  userId: string;
  organizationId: string;
  capabilities: Set<Capability>;
  /** True when the user's employer is not the organization that owns the 現場. */
  isExternal: boolean;
};

/**
 * Resolve what a user may do on one 現場.
 *
 * Two distinct paths, and the difference is the whole tenant boundary:
 *   - Same organization  → an explicit project role wins; otherwise their org-wide
 *                          default role applies.
 *   - Different org (協力会社) → access ONLY through an explicit, unexpired
 *                          projectMembers row. There is no inherited fallback,
 *                          so a partner can never see a project nobody granted.
 */
export async function resolveProjectAccess(
  userId: string,
  projectId: string,
): Promise<AccessContext> {
  const [user] = await db
    .select({
      id: users.id,
      organizationId: users.organizationId,
      isActive: users.isActive,
      defaultRoleId: users.defaultRoleId,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user || !user.isActive) throw new ForbiddenError(null, 'アカウントが無効です。');

  const [project] = await db
    .select({ id: projects.id, organizationId: projects.organizationId })
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1);

  if (!project) throw new NotFoundError('現場が見つかりません。');

  const isExternal = project.organizationId !== user.organizationId;

  // Explicit per-project grant, if one exists and has not expired.
  const [membership] = await db
    .select({ capabilities: roles.capabilities })
    .from(projectMembers)
    .innerJoin(roles, eq(roles.id, projectMembers.roleId))
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId),
        or(isNull(projectMembers.expiresAt), gt(projectMembers.expiresAt, new Date())),
      ),
    )
    .limit(1);

  if (membership) {
    return {
      userId,
      organizationId: project.organizationId,
      capabilities: new Set(membership.capabilities),
      isExternal,
    };
  }

  // No explicit grant. Outside users stop here — no inheritance across tenants.
  if (isExternal) {
    throw new ForbiddenError(null, 'この現場へのアクセス権がありません。');
  }

  if (!user.defaultRoleId) {
    throw new ForbiddenError(null, 'ロールが割り当てられていません。管理者にお問い合わせください。');
  }

  const [defaultRole] = await db
    .select({ capabilities: roles.capabilities })
    .from(roles)
    .where(eq(roles.id, user.defaultRoleId))
    .limit(1);

  return {
    userId,
    organizationId: project.organizationId,
    capabilities: new Set(defaultRole?.capabilities ?? []),
    isExternal: false,
  };
}

/** Org-wide capabilities, for screens that are not scoped to a 現場. */
export async function resolveOrgAccess(userId: string): Promise<AccessContext> {
  const [row] = await db
    .select({
      organizationId: users.organizationId,
      isActive: users.isActive,
      capabilities: roles.capabilities,
    })
    .from(users)
    .leftJoin(roles, eq(roles.id, users.defaultRoleId))
    .where(eq(users.id, userId))
    .limit(1);

  if (!row || !row.isActive) throw new ForbiddenError(null, 'アカウントが無効です。');

  return {
    userId,
    organizationId: row.organizationId,
    capabilities: new Set(row.capabilities ?? []),
    isExternal: false,
  };
}

export function can(ctx: AccessContext, capability: Capability): boolean {
  return ctx.capabilities.has(capability);
}

export function assertCan(ctx: AccessContext, capability: Capability): void {
  if (!ctx.capabilities.has(capability)) throw new ForbiddenError(capability);
}

/** Convenience for route handlers: resolve and assert in one step. */
export async function requireProjectCapability(
  userId: string,
  projectId: string,
  capability: Capability,
): Promise<AccessContext> {
  const ctx = await resolveProjectAccess(userId, projectId);
  assertCan(ctx, capability);
  return ctx;
}

export async function requireOrgCapability(
  userId: string,
  capability: Capability,
): Promise<AccessContext> {
  const ctx = await resolveOrgAccess(userId);
  assertCan(ctx, capability);
  return ctx;
}
