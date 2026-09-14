import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lte, sql } from 'drizzle-orm';
import { db } from '@/db';
import { photos, users, organizations } from '@/db/schema';
import { signedReadUrl } from '@/lib/storage';
import { toDate } from '@/lib/utils';

export type PhotoListItem = {
  id: string;
  takenAt: Date;
  category: string | null;
  workType: string | null;
  workDetail: string | null;
  title: string | null;
  shootingLocation: string | null;
  contractorNote: string | null;
  uploadSource: string;
  integrityStatus: string;
  thumbnailUrl: string | null;
  uploaderName: string | null;
};

export type PhotoFilters = {
  workType?: string;
  category?: string;
  integrityStatus?: 'valid' | 'invalid' | 'unsigned' | 'pending' | 'error';
  uploadSource?: 'mobile_camera' | 'web_upload' | 'import' | 'api';
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
};

/**
 * 現場の写真一覧。
 *
 * 並び順は撮影日時。台帳の並びと一致させるためで、アップロード順にすると
 * まとめて取り込んだときに現場の時系列とずれます。
 */
export async function listPhotos(
  projectId: string,
  filters: PhotoFilters = {},
): Promise<PhotoListItem[]> {
  const conditions = [eq(photos.projectId, projectId), isNull(photos.deletedAt)];
  if (filters.workType) conditions.push(eq(photos.workType, filters.workType));
  if (filters.category) conditions.push(sql`${photos.category}::text = ${filters.category}`);
  if (filters.integrityStatus) conditions.push(eq(photos.integrityStatus, filters.integrityStatus));
  if (filters.uploadSource) conditions.push(eq(photos.uploadSource, filters.uploadSource));
  if (filters.from) conditions.push(gte(photos.takenAt, filters.from));
  if (filters.to) conditions.push(lte(photos.takenAt, filters.to));

  const rows = await db
    .select({
      id: photos.id,
      takenAt: photos.takenAt,
      category: sql<string | null>`${photos.category}::text`,
      workType: photos.workType,
      workDetail: photos.workDetail,
      title: photos.title,
      shootingLocation: photos.shootingLocation,
      contractorNote: photos.contractorNote,
      uploadSource: photos.uploadSource,
      integrityStatus: photos.integrityStatus,
      thumbnailKey: photos.thumbnailKey,
      uploaderName: users.name,
    })
    .from(photos)
    .leftJoin(users, eq(users.id, photos.uploadedById))
    .where(and(...conditions))
    .orderBy(asc(photos.takenAt), asc(photos.sortOrder))
    .limit(filters.limit ?? 200)
    .offset(filters.offset ?? 0);

  return Promise.all(
    rows.map(async ({ thumbnailKey, ...row }) => ({
      ...row,
      thumbnailUrl: thumbnailKey ? await signedReadUrl(thumbnailKey) : null,
    })),
  );
}

/** 絞り込みパネルに出す件数。実データから作らないと数字が嘘になる。 */
export async function photoFacets(projectId: string) {
  const base = and(eq(photos.projectId, projectId), isNull(photos.deletedAt));

  const [byWorkType, byIntegrity, bySource, [totals]] = await Promise.all([
    db
      .select({ value: photos.workType, count: sql<number>`count(*)::int` })
      .from(photos).where(base).groupBy(photos.workType).orderBy(desc(sql`count(*)`)),
    db
      .select({ value: photos.integrityStatus, count: sql<number>`count(*)::int` })
      .from(photos).where(base).groupBy(photos.integrityStatus),
    db
      .select({ value: photos.uploadSource, count: sql<number>`count(*)::int` })
      .from(photos).where(base).groupBy(photos.uploadSource),
    db
      .select({
        total: sql<number>`count(*)::int`,
        earliest: sql<string | Date | null>`min(${photos.takenAt})`,
        latest: sql<string | Date | null>`max(${photos.takenAt})`,
      })
      .from(photos).where(base),
  ]);

  return {
    total: totals?.total ?? 0,
    earliest: toDate(totals?.earliest),
    latest: toDate(totals?.latest),
    byWorkType: byWorkType.filter((r) => r.value),
    byIntegrity,
    bySource,
  };
}

export async function getPhoto(projectId: string, photoId: string) {
  const [row] = await db
    .select()
    .from(photos)
    .where(and(eq(photos.id, photoId), eq(photos.projectId, projectId), isNull(photos.deletedAt)))
    .limit(1);
  return row ?? null;
}

/** 論理削除。監査ログのため行は残す。 */
/**
 * 組織の使用容量カウンタを動かす。
 *
 * サイドバーは毎回の描画で全写真を合計するわけにいかないためカウンタを読みます。
 * 写真が増減する場所で必ず一緒に動かさないと、画面の数字が現実とずれます。
 */
async function shiftStorageUsed(
  tx: typeof db,
  organizationId: string,
  deltaBytes: number,
): Promise<void> {
  if (deltaBytes === 0) return;
  await tx
    .update(organizations)
    .set({
      // 負にはしない。ずれた状態で引き算が続くと、残量が無限にあるように見える。
      storageUsedBytes: sql`greatest(0, ${organizations.storageUsedBytes} + ${deltaBytes})`,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, organizationId));
}

export async function softDeletePhotos(projectId: string, photoIds: string[], deletedById: string) {
  if (photoIds.length === 0) return 0;

  return db.transaction(async (tx) => {
    const rows = await tx
      .update(photos)
      .set({ deletedAt: new Date(), deletedById })
      .where(and(eq(photos.projectId, projectId), inArray(photos.id, photoIds), isNull(photos.deletedAt)))
      .returning({ id: photos.id, fileSize: photos.fileSize, organizationId: photos.organizationId });

    if (rows.length > 0) {
      const freed = rows.reduce((sum, r) => sum + (r.fileSize ?? 0), 0);
      await shiftStorageUsed(tx as unknown as typeof db, rows[0]!.organizationId, -freed);
    }
    return rows.length;
  });
}

export async function restorePhotos(projectId: string, photoIds: string[]) {
  if (photoIds.length === 0) return 0;

  return db.transaction(async (tx) => {
    const rows = await tx
      .update(photos)
      .set({ deletedAt: null, deletedById: null })
      // 削除済みのものだけを戻す。生きている行まで拾うと容量を二重に足してしまう。
      .where(
        and(
          eq(photos.projectId, projectId),
          inArray(photos.id, photoIds),
          isNotNull(photos.deletedAt),
        ),
      )
      .returning({ id: photos.id, fileSize: photos.fileSize, organizationId: photos.organizationId });

    if (rows.length > 0) {
      const restored = rows.reduce((sum, r) => sum + (r.fileSize ?? 0), 0);
      await shiftStorageUsed(tx as unknown as typeof db, rows[0]!.organizationId, restored);
    }
    return rows.length;
  });
}

/** 取り込み時に使用容量を足す。 */
export async function addStorageUsed(organizationId: string, bytes: number): Promise<void> {
  await shiftStorageUsed(db, organizationId, bytes);
}

export async function updatePhotoMetadata(
  projectId: string,
  photoId: string,
  patch: {
    title?: string | null;
    workType?: string | null;
    workKind?: string | null;
    workDetail?: string | null;
    shootingLocation?: string | null;
    contractorNote?: string | null;
    controlValue?: string | null;
    isRepresentative?: boolean;
  },
) {
  const [row] = await db
    .update(photos)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(photos.id, photoId), eq(photos.projectId, projectId)))
    .returning({ id: photos.id });
  return row ?? null;
}
