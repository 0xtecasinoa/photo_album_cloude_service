import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import { shareLinks, projects, photos } from '@/db/schema';
import { storage } from '@/lib/storage';

export type ShareLinkListItem = {
  id: string;
  token: string;
  name: string | null;
  hasPassword: boolean;
  allowDownload: boolean;
  maxViews: number | null;
  viewCount: number;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
};

export async function listShareLinks(
  organizationId: string,
  projectId: string,
): Promise<ShareLinkListItem[]> {
  const rows = await db
    .select({
      id: shareLinks.id,
      token: shareLinks.token,
      name: shareLinks.name,
      passwordHash: shareLinks.passwordHash,
      allowDownload: shareLinks.allowDownload,
      maxViews: shareLinks.maxViews,
      viewCount: shareLinks.viewCount,
      expiresAt: shareLinks.expiresAt,
      revokedAt: shareLinks.revokedAt,
      createdAt: shareLinks.createdAt,
    })
    .from(shareLinks)
    .where(
      and(eq(shareLinks.organizationId, organizationId), eq(shareLinks.projectId, projectId)),
    )
    .orderBy(sql`${shareLinks.createdAt} desc`);

  return rows.map(({ passwordHash, ...r }) => ({ ...r, hasPassword: Boolean(passwordHash) }));
}

export type CreateShareLinkInput = {
  organizationId: string;
  projectId: string;
  createdById: string;
  name?: string | null;
  password?: string | null;
  allowDownload: boolean;
  expiresInDays: number | null;
  maxViews: number | null;
};

export async function createShareLink(input: CreateShareLinkInput): Promise<{ token: string }> {
  // 32 バイト。推測で当てられる長さにはしない。
  const token = randomBytes(24).toString('base64url');

  await db.insert(shareLinks).values({
    organizationId: input.organizationId,
    projectId: input.projectId,
    createdById: input.createdById,
    token,
    name: input.name || null,
    passwordHash: input.password ? await bcrypt.hash(input.password, 12) : null,
    allowDownload: input.allowDownload,
    expiresAt: input.expiresInDays
      ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
      : null,
    maxViews: input.maxViews,
  });

  return { token };
}

export async function revokeShareLink(
  organizationId: string,
  shareLinkId: string,
): Promise<{ id: string; name: string | null } | null> {
  const [row] = await db
    .update(shareLinks)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(shareLinks.id, shareLinkId),
        eq(shareLinks.organizationId, organizationId),
        isNull(shareLinks.revokedAt),
      ),
    )
    .returning({ id: shareLinks.id, name: shareLinks.name });
  return row ?? null;
}

export type ShareLinkState =
  | { status: 'not_found' }
  | { status: 'revoked' }
  | { status: 'expired' }
  | { status: 'exhausted' }
  | {
      status: 'ok';
      id: string;
      projectId: string;
      organizationId: string;
      name: string | null;
      allowDownload: boolean;
      requiresPassword: boolean;
      passwordHash: string | null;
    };

/**
 * トークンから共有リンクを引き、使える状態かを返す。
 *
 * 「ない」「取り消された」「期限切れ」を呼び出し側で区別できるようにしています。
 * 全部まとめて404にすると、期限が切れただけの相手に
 * 「リンクが間違っている」と思わせてしまうためです。
 */
export async function resolveShareLink(token: string): Promise<ShareLinkState> {
  const [row] = await db
    .select()
    .from(shareLinks)
    .where(eq(shareLinks.token, token))
    .limit(1);

  if (!row || !row.projectId) return { status: 'not_found' };
  if (row.revokedAt) return { status: 'revoked' };
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return { status: 'expired' };
  if (row.maxViews !== null && row.viewCount >= row.maxViews) return { status: 'exhausted' };

  return {
    status: 'ok',
    id: row.id,
    projectId: row.projectId,
    organizationId: row.organizationId,
    name: row.name,
    allowDownload: row.allowDownload,
    requiresPassword: Boolean(row.passwordHash),
    passwordHash: row.passwordHash,
  };
}

export async function verifySharePassword(passwordHash: string, password: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

/** 閲覧数を1つ進める。上限つきリンクを使い切るための計上。 */
export async function countShareView(shareLinkId: string): Promise<void> {
  await db
    .update(shareLinks)
    .set({ viewCount: sql`${shareLinks.viewCount} + 1` })
    .where(eq(shareLinks.id, shareLinkId));
}

export type SharedPhoto = {
  id: string;
  takenAt: Date;
  title: string | null;
  category: string | null;
  workType: string | null;
  shootingLocation: string | null;
  contractorNote: string | null;
};

/** 共有画面に出す現場と写真。保存キーは外に出さない。 */
export async function loadSharedProject(projectId: string) {
  const [project] = await db
    .select({
      id: projects.id,
      name: projects.name,
      code: projects.code,
      clientName: projects.clientName,
      contractorName: projects.contractorName,
      location: projects.location,
    })
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1);
  if (!project) return null;

  const rows = await db
    .select({
      id: photos.id,
      takenAt: photos.takenAt,
      title: photos.title,
      category: sql<string | null>`${photos.category}::text`,
      workType: photos.workType,
      shootingLocation: photos.shootingLocation,
      contractorNote: photos.contractorNote,
    })
    .from(photos)
    .where(and(eq(photos.projectId, projectId), isNull(photos.deletedAt)))
    .orderBy(asc(photos.takenAt), asc(photos.sortOrder));

  return { project, photos: rows };
}

/**
 * 共有リンク越しに1枚の画像を読む。
 *
 * 写真が本当にその現場のものかを毎回確認します。写真IDだけで配ると、
 * 共有リンクを持っているだけで他の現場の写真まで読めてしまいます。
 */
export async function readSharedPhotoBytes(
  projectId: string,
  photoId: string,
  variant: 'thumb' | 'display' | 'original',
): Promise<{ bytes: Buffer; contentType: string; filename: string } | null> {
  const [row] = await db
    .select({
      storageKey: photos.storageKey,
      originalStorageKey: photos.originalStorageKey,
      thumbnailKey: photos.thumbnailKey,
      originalFilename: photos.originalFilename,
      mimeType: photos.mimeType,
    })
    .from(photos)
    .where(and(eq(photos.id, photoId), eq(photos.projectId, projectId), isNull(photos.deletedAt)))
    .limit(1);

  if (!row) return null;

  const key =
    variant === 'original'
      ? (row.originalStorageKey ?? row.storageKey)
      : variant === 'thumb'
        ? (row.thumbnailKey ?? row.storageKey)
        : row.storageKey;

  const bytes = await storage.get(key).catch(() => null);
  if (!bytes) return null;

  return {
    bytes,
    contentType: variant === 'original' ? (row.mimeType ?? 'image/jpeg') : 'image/jpeg',
    filename: row.originalFilename ?? `${photoId}.jpg`,
  };
}
