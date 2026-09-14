import { and, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  organizations,
  users,
  roles,
  projects,
  photos,
  contactInquiries,
} from '@/db/schema';

/**
 * 運営管理者向けの集計と一覧。
 *
 * ここだけはテナントの境界を越えて全社を横断します。呼び出す前に必ず
 * requirePlatformAdmin() を通してください。
 *
 * 写真そのものは扱いません。公共工事の成果品を運営側が閲覧できる状態は、
 * お客様に説明のつかないリスクのため、件数の集計だけに留めています。
 */

export type PlatformStats = {
  organizations: number;
  activeOrganizations: number;
  users: number;
  activeUsers: number;
  projects: number;
  photos: number;
  storageUsedBytes: number;
  newInquiries: number;
};

export async function getPlatformStats(): Promise<PlatformStats> {
  const [orgRow] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${organizations.isActive})::int`,
      storage: sql<string | number | null>`coalesce(sum(${organizations.storageUsedBytes}), 0)`,
    })
    .from(organizations);

  const [userRow] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${users.isActive})::int`,
    })
    .from(users);

  const [projectRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(projects)
    .where(isNull(projects.deletedAt));

  const [photoRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(photos)
    .where(isNull(photos.deletedAt));

  const [inquiryRow] = await db
    .select({ total: sql<number>`count(*) filter (where ${contactInquiries.status} = 'new')::int` })
    .from(contactInquiries);

  return {
    organizations: orgRow?.total ?? 0,
    activeOrganizations: orgRow?.active ?? 0,
    users: userRow?.total ?? 0,
    activeUsers: userRow?.active ?? 0,
    projects: projectRow?.total ?? 0,
    photos: photoRow?.total ?? 0,
    storageUsedBytes: Number(orgRow?.storage ?? 0),
    newInquiries: inquiryRow?.total ?? 0,
  };
}

export type AdminOrganization = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  seatLimit: number;
  memberCount: number;
  projectCount: number;
  photoCount: number;
  storageUsedBytes: number;
  storageQuotaBytes: number;
  trialEndsAt: Date | null;
  createdAt: Date;
};

export async function listAllOrganizations(query?: string): Promise<AdminOrganization[]> {
  const where = query
    ? or(ilike(organizations.name, `%${query}%`), ilike(organizations.slug, `%${query}%`))
    : undefined;

  const rows = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      plan: organizations.plan,
      isActive: organizations.isActive,
      seatLimit: organizations.seatLimit,
      storageUsedBytes: organizations.storageUsedBytes,
      storageQuotaBytes: organizations.storageQuotaBytes,
      trialEndsAt: organizations.trialEndsAt,
      createdAt: organizations.createdAt,
    })
    .from(organizations)
    .where(where)
    .orderBy(desc(organizations.createdAt));

  /*
   * 件数は会社ごとに集計したものを別々に引いて、ここで突き合わせます。
   *
   * 相関副問い合わせ（select ... where u.organization_id = organizations.id）は
   * 使いません。Drizzle が外側の列を修飾なしの "id" として出力するため、
   * 副問い合わせ側の users.id と突き合わされ、エラーにならないまま
   * すべて 0 件になります。
   * join で一度に取る方法も、写真とメンバーの組み合わせが掛け算になり
   * 件数が水増しされるため採りません。
   */
  const [memberRows, projectRows, photoRows] = await Promise.all([
    db
      .select({ organizationId: users.organizationId, n: sql<number>`count(*)::int` })
      .from(users)
      .groupBy(users.organizationId),
    db
      .select({ organizationId: projects.organizationId, n: sql<number>`count(*)::int` })
      .from(projects)
      .where(isNull(projects.deletedAt))
      .groupBy(projects.organizationId),
    db
      .select({ organizationId: photos.organizationId, n: sql<number>`count(*)::int` })
      .from(photos)
      .where(isNull(photos.deletedAt))
      .groupBy(photos.organizationId),
  ]);

  const members = new Map(memberRows.map((r) => [r.organizationId, r.n]));
  const projectCounts = new Map(projectRows.map((r) => [r.organizationId, r.n]));
  const photoCounts = new Map(photoRows.map((r) => [r.organizationId, r.n]));

  return rows.map((o) => ({
    ...o,
    memberCount: members.get(o.id) ?? 0,
    projectCount: projectCounts.get(o.id) ?? 0,
    photoCount: photoCounts.get(o.id) ?? 0,
  }));
}

export type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  isActive: boolean;
  isPlatformAdmin: boolean;
  organizationId: string;
  organizationName: string;
  roleName: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
};

export async function listAllUsers(query?: string): Promise<AdminUser[]> {
  const where = query
    ? or(
        ilike(users.email, `%${query}%`),
        ilike(users.name, `%${query}%`),
        ilike(organizations.name, `%${query}%`),
      )
    : undefined;

  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      isActive: users.isActive,
      isPlatformAdmin: users.isPlatformAdmin,
      organizationId: users.organizationId,
      organizationName: organizations.name,
      roleName: roles.name,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .innerJoin(organizations, eq(organizations.id, users.organizationId))
    .leftJoin(roles, eq(roles.id, users.defaultRoleId))
    .where(where)
    .orderBy(desc(users.createdAt));
}

export type AdminInquiry = {
  id: string;
  company: string;
  name: string;
  email: string;
  phone: string | null;
  topic: string;
  message: string | null;
  planInterest: string | null;
  status: string;
  organizationName: string | null;
  createdAt: Date;
};

export async function listInquiries(status?: string): Promise<AdminInquiry[]> {
  const where = status && status !== 'all' ? eq(contactInquiries.status, status) : undefined;

  return db
    .select({
      id: contactInquiries.id,
      company: contactInquiries.company,
      name: contactInquiries.name,
      email: contactInquiries.email,
      phone: contactInquiries.phone,
      topic: contactInquiries.topic,
      message: contactInquiries.message,
      planInterest: contactInquiries.planInterest,
      status: contactInquiries.status,
      organizationName: organizations.name,
      createdAt: contactInquiries.createdAt,
    })
    .from(contactInquiries)
    .leftJoin(organizations, eq(organizations.id, contactInquiries.organizationId))
    .where(where)
    .orderBy(desc(contactInquiries.createdAt));
}

export async function setInquiryStatus(inquiryId: string, status: string) {
  const [row] = await db
    .update(contactInquiries)
    .set({ status })
    .where(eq(contactInquiries.id, inquiryId))
    .returning({ id: contactInquiries.id, company: contactInquiries.company });
  return row ?? null;
}

export async function setOrganizationActive(organizationId: string, isActive: boolean) {
  const [row] = await db
    .update(organizations)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(organizations.id, organizationId))
    .returning({ id: organizations.id, name: organizations.name });
  return row ?? null;
}

export async function setUserActive(userId: string, isActive: boolean) {
  const [row] = await db
    .update(users)
    .set({ isActive, updatedAt: new Date() })
    // 運営管理者どうしで締め出し合う事故を防ぐため、対象から外す。
    .where(and(eq(users.id, userId), eq(users.isPlatformAdmin, false)))
    .returning({ id: users.id, email: users.email, name: users.name });
  return row ?? null;
}
