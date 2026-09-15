import { and, desc, eq, gt, isNull, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { notifications, notificationReads, photos, projects, users } from '@/db/schema';
import { safeCallbackUrl } from '@/lib/auth/callback-url';

export type NoticeLevel = 'info' | 'warning' | 'critical';

export type Notice = {
  id: string;
  level: NoticeLevel;
  title: string;
  body: string | null;
  linkUrl: string | null;
  createdAt: Date;
  read: boolean;
  /** 運営からのお知らせか、データから導いた警告か。 */
  source: 'announcement' | 'derived';
};

/** 掲示中（削除されておらず、期限切れでもない）お知らせの条件。 */
function visibleTo(organizationId: string) {
  return and(
    isNull(notifications.deletedAt),
    or(isNull(notifications.organizationId), eq(notifications.organizationId, organizationId)),
    or(isNull(notifications.expiresAt), gt(notifications.expiresAt, new Date())),
  );
}

/**
 * データから導ける警告。
 *
 * 行としては保存しません。写真を直したり除外したりすれば消えるべきもので、
 * 保存すると「直したのに警告が残る」状態になるためです。
 */
async function derivedAlerts(organizationId: string): Promise<Notice[]> {
  const [row] = await db
    .select({
      unverified: sql<number>`count(${photos.id}) filter (where ${photos.integrityStatus} <> 'valid')::int`,
    })
    .from(photos)
    .innerJoin(projects, eq(projects.id, photos.projectId))
    .where(
      and(
        eq(photos.organizationId, organizationId),
        isNull(photos.deletedAt),
        isNull(projects.deletedAt),
        eq(projects.contractType, 'public'),
      ),
    );

  const unverified = row?.unverified ?? 0;
  if (unverified === 0) return [];

  return [
    {
      id: 'derived:unverified-photos',
      level: 'warning',
      title: `署名が検証できない写真が ${unverified} 枚あります`,
      body: '公共工事の現場に含まれています。電子納品の出力前に、除外または差し替えが必要です。',
      linkUrl: '/projects',
      createdAt: new Date(),
      read: true, // 未読件数には数えない。消し方が「読む」ことではないため。
      source: 'derived',
    },
  ];
}

/** 利用者に見せる通知一覧。運営のお知らせを上に、導出した警告を続けて返す。 */
export async function listNotices(organizationId: string, userId: string): Promise<Notice[]> {
  const rows = await db
    .select({
      id: notifications.id,
      level: notifications.level,
      title: notifications.title,
      body: notifications.body,
      linkUrl: notifications.linkUrl,
      createdAt: notifications.createdAt,
      readAt: notificationReads.readAt,
    })
    .from(notifications)
    .leftJoin(
      notificationReads,
      and(
        eq(notificationReads.notificationId, notifications.id),
        eq(notificationReads.userId, userId),
      ),
    )
    .where(visibleTo(organizationId))
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  const announcements: Notice[] = rows.map((r) => ({
    id: r.id,
    level: (r.level as NoticeLevel) ?? 'info',
    title: r.title,
    body: r.body,
    linkUrl: r.linkUrl,
    createdAt: r.createdAt,
    read: r.readAt !== null,
    source: 'announcement',
  }));

  return [...announcements, ...(await derivedAlerts(organizationId))];
}

/** ベルに出す未読件数。運営のお知らせのうち、まだ読んでいないもの。 */
export async function unreadNoticeCount(organizationId: string, userId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .leftJoin(
      notificationReads,
      and(
        eq(notificationReads.notificationId, notifications.id),
        eq(notificationReads.userId, userId),
      ),
    )
    .where(and(visibleTo(organizationId), isNull(notificationReads.readAt)));

  return row?.n ?? 0;
}

/** 開いたお知らせを既読にする。すでに読んでいれば何もしない。 */
export async function markNoticesRead(
  organizationId: string,
  userId: string,
  noticeIds: string[],
): Promise<void> {
  // 導出した警告には id が "derived:" で始まる。保存対象ではない。
  const ids = noticeIds.filter((id) => !id.startsWith('derived:'));
  if (ids.length === 0) return;

  // 他社のお知らせを既読にしようとしても入らないよう、見える範囲で絞る。
  const visible = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(visibleTo(organizationId));
  const allowed = new Set(visible.map((v) => v.id));

  const values = ids
    .filter((id) => allowed.has(id))
    .map((notificationId) => ({ notificationId, userId }));
  if (values.length === 0) return;

  await db.insert(notificationReads).values(values).onConflictDoNothing();
}

/* ---------- 運営側 ---------- */

export type AdminNotice = {
  id: string;
  level: string;
  title: string;
  body: string | null;
  linkUrl: string | null;
  organizationId: string | null;
  createdAt: Date;
  expiresAt: Date | null;
  readCount: number;
  audienceSize: number;
  /** 掲示期間が過ぎているか。描画時に現在時刻を読まずに済むよう、ここで判定する。 */
  expired: boolean;
};

export async function listAllNotices(): Promise<AdminNotice[]> {
  const rows = await db
    .select({
      id: notifications.id,
      level: notifications.level,
      title: notifications.title,
      body: notifications.body,
      linkUrl: notifications.linkUrl,
      organizationId: notifications.organizationId,
      createdAt: notifications.createdAt,
      expiresAt: notifications.expiresAt,
    })
    .from(notifications)
    .where(isNull(notifications.deletedAt))
    .orderBy(desc(notifications.createdAt));

  // 既読数と宛先人数は別々に数える。join でまとめると件数が掛け算になる。
  const readRows = await db
    .select({ notificationId: notificationReads.notificationId, n: sql<number>`count(*)::int` })
    .from(notificationReads)
    .groupBy(notificationReads.notificationId);
  const reads = new Map(readRows.map((r) => [r.notificationId, r.n]));

  const orgSizes = await db
    .select({ organizationId: users.organizationId, n: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.isActive, true))
    .groupBy(users.organizationId);
  const sizeByOrg = new Map(orgSizes.map((r) => [r.organizationId, r.n]));
  const total = orgSizes.reduce((sum, r) => sum + r.n, 0);

  const now = Date.now();
  return rows.map((r) => ({
    ...r,
    readCount: reads.get(r.id) ?? 0,
    audienceSize: r.organizationId ? (sizeByOrg.get(r.organizationId) ?? 0) : total,
    expired: r.expiresAt !== null && r.expiresAt.getTime() < now,
  }));
}

export type CreateNoticeInput = {
  organizationId: string | null;
  level: NoticeLevel;
  title: string;
  body: string | null;
  linkUrl: string | null;
  expiresAt: Date | null;
  createdById: string;
};

export async function createNotice(input: CreateNoticeInput): Promise<{ id: string }> {
  const [row] = await db
    .insert(notifications)
    .values({
      ...input,
      // 遷移先は同一サイトのパスだけ。外部サイトへ誘導するお知らせは出せない。
      linkUrl: input.linkUrl ? safeCallbackUrl(input.linkUrl) : null,
    })
    .returning({ id: notifications.id });
  return row!;
}

export async function softDeleteNotice(noticeId: string) {
  const [row] = await db
    .update(notifications)
    .set({ deletedAt: new Date() })
    .where(and(eq(notifications.id, noticeId), isNull(notifications.deletedAt)))
    .returning({ id: notifications.id, title: notifications.title });
  return row ?? null;
}
