import { and, desc, eq, gte, ilike, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { accessLogs } from '@/db/schema';
import { toDate } from '@/lib/utils';

/**
 * アクセスログの集計と一覧。
 *
 * 呼ぶ前に必ず requireAccessLogViewer() を通してください。
 * 利用者一人ひとりの行動が分かる記録です。
 */

export type AccessLogFilters = {
  /** 何日前までを見るか。 */
  days?: number;
  query?: string;
  section?: string;
  userId?: string;
  limit?: number;
};

function since(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function conditionsFor(filters: AccessLogFilters) {
  const list = [gte(accessLogs.createdAt, since(filters.days ?? 7))];
  if (filters.section) list.push(eq(accessLogs.section, filters.section));
  if (filters.userId) list.push(eq(accessLogs.userId, filters.userId));
  if (filters.query?.trim()) {
    const needle = `%${filters.query.trim()}%`;
    list.push(
      or(
        ilike(accessLogs.userEmail, needle),
        ilike(accessLogs.userName, needle),
        ilike(accessLogs.organizationName, needle),
        ilike(accessLogs.path, needle),
        ilike(accessLogs.ipAddress, needle),
      )!,
    );
  }
  return and(...list);
}

export type AccessSummary = {
  views: number;
  users: number;
  organizations: number;
  anonymousViews: number;
};

export async function getAccessSummary(filters: AccessLogFilters): Promise<AccessSummary> {
  const [row] = await db
    .select({
      views: sql<number>`count(*)::int`,
      users: sql<number>`count(distinct ${accessLogs.userId})::int`,
      organizations: sql<number>`count(distinct ${accessLogs.organizationId})::int`,
      anonymousViews: sql<number>`count(*) filter (where ${accessLogs.userId} is null)::int`,
    })
    .from(accessLogs)
    .where(conditionsFor(filters));

  return row ?? { views: 0, users: 0, organizations: 0, anonymousViews: 0 };
}

/** よく見られている画面。どの機能が使われているかを知るため。 */
export async function getTopSections(filters: AccessLogFilters) {
  return db
    .select({ value: accessLogs.section, count: sql<number>`count(*)::int` })
    .from(accessLogs)
    .where(conditionsFor(filters))
    .groupBy(accessLogs.section)
    .orderBy(desc(sql`count(*)`))
    .limit(12);
}

export async function getTopPaths(filters: AccessLogFilters) {
  return db
    .select({ value: accessLogs.path, count: sql<number>`count(*)::int` })
    .from(accessLogs)
    .where(conditionsFor(filters))
    .groupBy(accessLogs.path)
    .orderBy(desc(sql`count(*)`))
    .limit(15);
}

export async function getDeviceBreakdown(filters: AccessLogFilters) {
  return db
    .select({ value: accessLogs.device, count: sql<number>`count(*)::int` })
    .from(accessLogs)
    .where(conditionsFor(filters))
    .groupBy(accessLogs.device)
    .orderBy(desc(sql`count(*)`));
}

export type UserActivity = {
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  organizationName: string | null;
  views: number;
  sections: number;
  firstSeen: Date | null;
  lastSeen: Date | null;
  devices: string | null;
};

/** 利用者ごとの動き。誰がどれだけ触っているかを見る。 */
export async function getUserActivity(filters: AccessLogFilters): Promise<UserActivity[]> {
  const rows = await db
    .select({
      userId: accessLogs.userId,
      userName: accessLogs.userName,
      userEmail: accessLogs.userEmail,
      organizationName: accessLogs.organizationName,
      views: sql<number>`count(*)::int`,
      sections: sql<number>`count(distinct ${accessLogs.section})::int`,
      firstSeen: sql<string | Date | null>`min(${accessLogs.createdAt})`,
      lastSeen: sql<string | Date | null>`max(${accessLogs.createdAt})`,
      devices: sql<string | null>`string_agg(distinct ${accessLogs.device}, '・')`,
    })
    .from(accessLogs)
    .where(and(conditionsFor(filters), sql`${accessLogs.userId} is not null`))
    .groupBy(accessLogs.userId, accessLogs.userName, accessLogs.userEmail, accessLogs.organizationName)
    .orderBy(desc(sql`count(*)`))
    .limit(100);

  return rows.map((r) => ({
    ...r,
    firstSeen: toDate(r.firstSeen),
    lastSeen: toDate(r.lastSeen),
  }));
}

/** 時間帯ごとの件数。いつ使われているかを見る（日本時間）。 */
export async function getHourlyPattern(filters: AccessLogFilters) {
  const rows = await db
    .select({
      hour: sql<number>`extract(hour from ${accessLogs.createdAt} at time zone 'Asia/Tokyo')::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(accessLogs)
    .where(conditionsFor(filters))
    .groupBy(sql`extract(hour from ${accessLogs.createdAt} at time zone 'Asia/Tokyo')`)
    .orderBy(sql`extract(hour from ${accessLogs.createdAt} at time zone 'Asia/Tokyo')`);

  // 抜けている時間帯は 0 で埋める。棒が飛ぶと読み違える。
  const byHour = new Map(rows.map((r) => [r.hour, r.count]));
  return Array.from({ length: 24 }, (_, hour) => ({ hour, count: byHour.get(hour) ?? 0 }));
}

export type AccessLogRow = {
  id: string;
  userName: string | null;
  userEmail: string | null;
  organizationName: string | null;
  path: string;
  section: string | null;
  device: string | null;
  ipAddress: string | null;
  referrer: string | null;
  createdAt: Date;
};

export async function listAccessLogs(filters: AccessLogFilters): Promise<AccessLogRow[]> {
  return db
    .select({
      id: accessLogs.id,
      userName: accessLogs.userName,
      userEmail: accessLogs.userEmail,
      organizationName: accessLogs.organizationName,
      path: accessLogs.path,
      section: accessLogs.section,
      device: accessLogs.device,
      ipAddress: accessLogs.ipAddress,
      referrer: accessLogs.referrer,
      createdAt: accessLogs.createdAt,
    })
    .from(accessLogs)
    .where(conditionsFor(filters))
    .orderBy(desc(accessLogs.createdAt))
    .limit(filters.limit ?? 200);
}
