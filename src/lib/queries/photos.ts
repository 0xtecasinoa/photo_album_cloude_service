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
  tags: string[];
  ocrStatus: string;
  designValue: string | null;
  measuredValue: string | null;
};

export type PhotoSort = 'takenAsc' | 'takenDesc' | 'uploadedDesc' | 'titleAsc';

export type PhotoFilters = {
  /** 写真の情報と、看板から読み取った文字の両方を対象に探す。 */
  query?: string;
  workType?: string;
  workKind?: string;
  workDetail?: string;
  category?: string;
  integrityStatus?: 'valid' | 'invalid' | 'unsigned' | 'pending' | 'error';
  uploadSource?: 'mobile_camera' | 'web_upload' | 'import' | 'api';
  /** 看板の読み取り状況。done = 解析済み、pending/failed = 未解析。 */
  ocrStatus?: 'done' | 'undone';
  tag?: string;
  from?: Date;
  to?: Date;
  sort?: PhotoSort;
  limit?: number;
  offset?: number;
};

/**
 * 並び順。
 *
 * 既定は撮影日時の昇順。台帳の並びと一致させるためで、アップロード順に
 * すると、まとめて取り込んだときに現場の時系列とずれます。
 */
function orderFor(sort: PhotoSort | undefined) {
  switch (sort) {
    case 'takenDesc':
      return [desc(photos.takenAt), asc(photos.sortOrder)];
    case 'uploadedDesc':
      return [desc(photos.createdAt)];
    case 'titleAsc':
      // 未入力を後ろに送る。空欄が先頭に並ぶと探しにくい。
      return [sql`${photos.title} asc nulls last`, asc(photos.takenAt)];
    default:
      return [asc(photos.takenAt), asc(photos.sortOrder)];
  }
}

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
  if (filters.workKind) conditions.push(eq(photos.workKind, filters.workKind));
  if (filters.workDetail) conditions.push(eq(photos.workDetail, filters.workDetail));
  if (filters.category) conditions.push(sql`${photos.category}::text = ${filters.category}`);
  if (filters.tag) conditions.push(sql`${filters.tag} = any(${photos.tags})`);
  if (filters.ocrStatus === 'done') conditions.push(eq(photos.ocrStatus, 'done'));
  if (filters.ocrStatus === 'undone') conditions.push(sql`${photos.ocrStatus} <> 'done'`);

  /*
   * 検索は写真の管理項目に加えて、看板から読み取った文字も対象にする。
   * 現場は「あの黒板に書いてあった言葉」で探すため、管理項目だけだと
   * 目当ての写真にたどり着けない。
   */
  if (filters.query?.trim()) {
    const needle = `%${filters.query.trim()}%`;
    conditions.push(
      sql`(
        coalesce(${photos.title}, '') ilike ${needle}
        or coalesce(${photos.workType}, '') ilike ${needle}
        or coalesce(${photos.workKind}, '') ilike ${needle}
        or coalesce(${photos.workDetail}, '') ilike ${needle}
        or coalesce(${photos.shootingLocation}, '') ilike ${needle}
        or coalesce(${photos.contractorNote}, '') ilike ${needle}
        or coalesce(${photos.originalFilename}, '') ilike ${needle}
        or coalesce(${photos.ocrText}, '') ilike ${needle}
      )`,
    );
  }
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
      tags: photos.tags,
      ocrStatus: photos.ocrStatus,
      designValue: photos.designValue,
      measuredValue: photos.measuredValue,
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
    .orderBy(...orderFor(filters.sort))
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
export type WorkTypeNode = {
  value: string;
  count: number;
  children: { value: string; count: number; children: { value: string; count: number }[] }[];
};

/**
 * 絞り込みに出す集計。
 *
 * 工種は「工種 > 種別 > 細別」の入れ子で返します。現場の分類はこの3段で
 * 決まっており、平らに並べると同じ名前の細別がどの工種のものか分かりません。
 */
export async function photoFacets(projectId: string) {
  const base = and(eq(photos.projectId, projectId), isNull(photos.deletedAt));

  const [tree, byIntegrity, bySource, byOcr, byTag, [totals]] = await Promise.all([
    db
      .select({
        workType: photos.workType,
        workKind: photos.workKind,
        workDetail: photos.workDetail,
        count: sql<number>`count(*)::int`,
      })
      .from(photos)
      .where(base)
      .groupBy(photos.workType, photos.workKind, photos.workDetail),
    db
      .select({ value: photos.integrityStatus, count: sql<number>`count(*)::int` })
      .from(photos).where(base).groupBy(photos.integrityStatus),
    db
      .select({ value: photos.uploadSource, count: sql<number>`count(*)::int` })
      .from(photos).where(base).groupBy(photos.uploadSource),
    db
      .select({
        done: sql<number>`count(*) filter (where ${photos.ocrStatus} = 'done')::int`,
        undone: sql<number>`count(*) filter (where ${photos.ocrStatus} <> 'done')::int`,
      })
      .from(photos).where(base),
    // タグは配列なので、展開してから数える。
    db
      .select({ value: sql<string>`tag`, count: sql<number>`count(*)::int` })
      .from(sql`(select unnest(${photos.tags}) as tag from ${photos} where ${base}) t`)
      .groupBy(sql`tag`)
      .orderBy(desc(sql`count(*)`)),
    db
      .select({
        total: sql<number>`count(*)::int`,
        earliest: sql<string | Date | null>`min(${photos.takenAt})`,
        latest: sql<string | Date | null>`max(${photos.takenAt})`,
      })
      .from(photos).where(base),
  ]);

  // 平らな集計を3段の入れ子に組み直す。
  const byWorkTypeTree: WorkTypeNode[] = [];
  for (const row of tree) {
    if (!row.workType) continue;
    let type = byWorkTypeTree.find((t) => t.value === row.workType);
    if (!type) {
      type = { value: row.workType, count: 0, children: [] };
      byWorkTypeTree.push(type);
    }
    type.count += row.count;

    if (!row.workKind) continue;
    let kind = type.children.find((k) => k.value === row.workKind);
    if (!kind) {
      kind = { value: row.workKind, count: 0, children: [] };
      type.children.push(kind);
    }
    kind.count += row.count;

    if (!row.workDetail) continue;
    let detail = kind.children.find((d) => d.value === row.workDetail);
    if (!detail) {
      detail = { value: row.workDetail, count: 0 };
      kind.children.push(detail);
    }
    detail.count += row.count;
  }
  byWorkTypeTree.sort((a, b) => b.count - a.count);

  return {
    total: totals?.total ?? 0,
    earliest: toDate(totals?.earliest),
    latest: toDate(totals?.latest),
    byWorkType: byWorkTypeTree,
    byIntegrity,
    bySource,
    byOcr: { done: byOcr[0]?.done ?? 0, undone: byOcr[0]?.undone ?? 0 },
    byTag,
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

/**
 * 選んだ写真にタグを足す／外す。
 *
 * 置き換えではなく足し引きにしているのは、複数人が別々の観点で
 * タグを付けるためです。置き換えだと後から付けた人が前の人のタグを消します。
 */
export async function updatePhotoTags(
  projectId: string,
  photoIds: string[],
  add: string[],
  remove: string[],
): Promise<number> {
  if (photoIds.length === 0) return 0;

  const cleanAdd = [...new Set(add.map((t) => t.trim()).filter(Boolean))].slice(0, 20);
  const cleanRemove = [...new Set(remove.map((t) => t.trim()).filter(Boolean))];
  if (cleanAdd.length === 0 && cleanRemove.length === 0) return 0;

  const rows = await db
    .update(photos)
    .set({
      /*
       * 配列の重複を避けるため、一度ばらして足し引きし、並べ直す。
       * 同じタグが二重に入ると、絞り込みの件数が実際より多く見える。
       */
      tags: sql`(
        select coalesce(array_agg(distinct t order by t), '{}')
        from unnest(${photos.tags} || ${cleanAdd}::text[]) as t
        where t <> all(${cleanRemove}::text[])
      )`,
      updatedAt: new Date(),
    })
    .where(and(eq(photos.projectId, projectId), inArray(photos.id, photoIds), isNull(photos.deletedAt)))
    .returning({ id: photos.id });

  return rows.length;
}
