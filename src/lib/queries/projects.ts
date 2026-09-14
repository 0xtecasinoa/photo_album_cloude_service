import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import { projects, photos, projectMembers, roles, users } from '@/db/schema';
import type { Capability } from '@/lib/acl/capabilities';
import { toDate } from '@/lib/utils';

export type ProjectListItem = {
  id: string;
  name: string;
  code: string | null;
  status: string;
  contractType: 'public' | 'private';
  clientName: string | null;
  photoCount: number;
  lastShotAt: Date | null;
  updatedAt: Date;
};

/**
 * 組織の現場一覧。
 *
 * 写真枚数は projects.photo_count ではなく photos を数えて出します。
 * カウンタ列は更新漏れでずれることがあり、一覧で嘘の数字が出ると
 * 「アップロードできていないのでは」と現場を不安にさせるためです。
 */
export async function listProjects(organizationId: string): Promise<ProjectListItem[]> {
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      code: projects.code,
      status: projects.status,
      contractType: projects.contractType,
      clientName: projects.clientName,
      updatedAt: projects.updatedAt,
      photoCount: sql<number>`count(${photos.id}) filter (where ${photos.deletedAt} is null)::int`,
      // 集計関数の戻り値はドライバが Date に変換してくれないことがあるため、
      // 型を偽らずここで受けてから正規化する。
      lastShotAt: sql<string | Date | null>`max(${photos.takenAt}) filter (where ${photos.deletedAt} is null)`,
    })
    .from(projects)
    .leftJoin(photos, eq(photos.projectId, projects.id))
    .where(and(eq(projects.organizationId, organizationId), isNull(projects.deletedAt)))
    .groupBy(projects.id)
    .orderBy(desc(projects.updatedAt));

  return rows.map((r) => ({ ...r, lastShotAt: toDate(r.lastShotAt) }));
}


export async function getProject(organizationId: string, projectId: string) {
  const [row] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.organizationId, organizationId),
        isNull(projects.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

export type CreateProjectInput = {
  organizationId: string;
  createdById: string;
  name: string;
  code?: string | null;
  contractType: 'public' | 'private';
  clientName?: string | null;
  contractorName?: string | null;
  location?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
};

export class DuplicateProjectCodeError extends Error {
  constructor() {
    super('その工事番号はすでに使われています。');
    this.name = 'DuplicateProjectCodeError';
  }
}

export async function createProject(input: CreateProjectInput) {
  // 工事番号は組織内で一意。UNIQUE 制約の違反を待つより、先に見て分かりやすく返す。
  if (input.code) {
    const [dup] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.organizationId, input.organizationId), eq(projects.code, input.code)))
      .limit(1);
    if (dup) throw new DuplicateProjectCodeError();
  }

  return db.transaction(async (tx) => {
    const [project] = await tx
      .insert(projects)
      .values({
        organizationId: input.organizationId,
        name: input.name,
        code: input.code || null,
        contractType: input.contractType,
        clientName: input.clientName || null,
        contractorName: input.contractorName || null,
        location: input.location || null,
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
        status: 'active',
        createdById: input.createdById,
      })
      .returning();

    // 作成者を現場のメンバーに入れておく。入れ忘れると、自分で作った現場に
    // 入れない状態になる。
    const [ownerRole] = await tx
      .select({ id: roles.id })
      .from(roles)
      .where(and(eq(roles.organizationId, input.organizationId), eq(roles.slug, 'owner')))
      .limit(1);

    if (ownerRole) {
      await tx.insert(projectMembers).values({
        projectId: project!.id,
        userId: input.createdById,
        roleId: ownerRole.id,
        grantedById: input.createdById,
      });
    }

    return project!;
  });
}

export async function updateProject(
  organizationId: string,
  projectId: string,
  patch: Partial<Omit<CreateProjectInput, 'organizationId' | 'createdById'>>,
) {
  const [row] = await db
    .update(projects)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(projects.id, projectId), eq(projects.organizationId, organizationId)))
    .returning();
  return row ?? null;
}

/** 論理削除。監査ログと復元のため、行は残す。 */
export async function softDeleteProject(organizationId: string, projectId: string) {
  const [row] = await db
    .update(projects)
    .set({ deletedAt: new Date() })
    .where(and(eq(projects.id, projectId), eq(projects.organizationId, organizationId)))
    .returning({ id: projects.id, name: projects.name });
  return row ?? null;
}

/** 組織全体の集計。ダッシュボード用。 */
export async function getOrganizationStats(organizationId: string) {
  const [row] = await db
    .select({
      activeProjects: sql<number>`count(distinct ${projects.id}) filter (where ${projects.status} = 'active')::int`,
      totalPhotos: sql<number>`count(${photos.id}) filter (where ${photos.deletedAt} is null)::int`,
      unverified: sql<number>`count(${photos.id}) filter (where ${photos.deletedAt} is null and ${photos.integrityStatus} <> 'valid')::int`,
    })
    .from(projects)
    .leftJoin(photos, eq(photos.projectId, projects.id))
    .where(and(eq(projects.organizationId, organizationId), isNull(projects.deletedAt)));

  return row ?? { activeProjects: 0, totalPhotos: 0, unverified: 0 };
}

/** 現場に対する実効権限。プロジェクト固有のロールがなければ組織の既定ロール。 */
export async function capabilitiesForProject(
  userId: string,
  projectId: string,
): Promise<Set<Capability>> {
  const [membership] = await db
    .select({ capabilities: roles.capabilities })
    .from(projectMembers)
    .innerJoin(roles, eq(roles.id, projectMembers.roleId))
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
    .limit(1);

  if (membership) return new Set(membership.capabilities);

  const [fallback] = await db
    .select({ capabilities: roles.capabilities })
    .from(users)
    .leftJoin(roles, eq(roles.id, users.defaultRoleId))
    .where(eq(users.id, userId))
    .limit(1);

  return new Set(fallback?.capabilities ?? []);
}
