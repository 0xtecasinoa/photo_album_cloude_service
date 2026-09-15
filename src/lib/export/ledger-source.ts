import { and, asc, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { photos, projects } from '@/db/schema';
import { storage } from '@/lib/storage';
import type { LedgerData } from './types';

/**
 * 出力対象データの取得。
 *
 * 画面と出力で同じ並び（撮影日時順）にしています。台帳の並びが
 * 一覧と違うと、現場で「抜けている」と誤解されるためです。
 */
export async function loadLedgerData(
  organizationId: string,
  projectId: string,
  options: {
    includeBytes?: boolean;
    /**
     * どのレンディションを読むか。
     * 電子納品は原本（無加工でなければ成果品にならない）、
     * PDF と Excel は表示用（原本を全部読むとメモリが持たない）。
     */
    bytesFrom?: 'original' | 'display';
    excludeIds?: string[];
  } = {},
): Promise<LedgerData | null> {
  const [project] = await db
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

  if (!project) return null;

  const excluded = new Set(options.excludeIds ?? []);
  const bytesKey = (p: { storageKey: string; originalStorageKey: string | null }) =>
    options.bytesFrom === 'display' ? p.storageKey : (p.originalStorageKey ?? p.storageKey);

  const allRows = await db
    .select()
    .from(photos)
    .where(and(eq(photos.projectId, projectId), isNull(photos.deletedAt)))
    .orderBy(asc(photos.takenAt), asc(photos.sortOrder));

  // 除外は SQL ではなくここで行う。除外 id は利用者からの入力なので、
  // 現場に属さない id が混ざっても他現場の写真に影響しないようにする。
  const rows = excluded.size === 0 ? allRows : allRows.filter((r) => !excluded.has(r.id));

  const ledgerPhotos = await Promise.all(
    rows.map(async (p) => ({
      id: p.id,
      takenAt: p.takenAt,
      largeClass: p.largeClass,
      category: p.category,
      workType: p.workType,
      workKind: p.workKind,
      workDetail: p.workDetail,
      title: p.title,
      shootingLocation: p.shootingLocation,
      controlValue: p.controlValue,
      designValue: p.designValue,
      measuredValue: p.measuredValue,
      contractorNote: p.contractorNote,
      isRepresentative: p.isRepresentative,
      isFrequencySubmission: p.isFrequencySubmission,
      originalFilename: p.originalFilename,
      integrityStatus: p.integrityStatus,
      width: p.width,
      height: p.height,
      /*
       * 画像本体は電子納品のときだけ読み込む。
       * 一覧や適合チェックのたびに全ファイルを読むと、数千枚の現場で
       * メモリを使い切るため。
       */
      bytes: options.includeBytes
        ? await storage.get(bytesKey(p)).catch((error) => {
            // 欠落は呼び出し側（電子納品の組み立て）で必ず検出して止める。
            // ここでは運用者が原因を追えるようキーを残すだけにする。
            console.error('[ledger-source] photo file unreadable', {
              photoId: p.id,
              key: bytesKey(p),
              error,
            });
            return undefined;
          })
        : undefined,
    })),
  );

  return {
    project: {
      name: project.name,
      code: project.code,
      clientName: project.clientName,
      contractorName: project.contractorName,
      location: project.location,
      startDate: project.startDate,
      endDate: project.endDate,
      isPublicWorks: project.contractType === 'public',
    },
    photos: ledgerPhotos,
  };
}

/** 台帳プレビュー用。画像は表示用レンディションの URL で渡す。 */
export async function loadLedgerPreview(organizationId: string, projectId: string) {
  const [project] = await db
    .select({ id: projects.id, name: projects.name, code: projects.code })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.organizationId, organizationId)))
    .limit(1);
  if (!project) return null;

  const rows = await db
    .select({
      id: photos.id,
      takenAt: photos.takenAt,
      category: photos.category,
      workType: photos.workType,
      workDetail: photos.workDetail,
      title: photos.title,
      shootingLocation: photos.shootingLocation,
      contractorNote: photos.contractorNote,
      controlValue: photos.controlValue,
      storageKey: photos.storageKey,
    })
    .from(photos)
    .where(and(eq(photos.projectId, projectId), isNull(photos.deletedAt)))
    .orderBy(asc(photos.takenAt), asc(photos.sortOrder));

  return {
    project,
    photos: await Promise.all(
      rows.map(async ({ storageKey, ...r }) => ({
        ...r,
        imageUrl: await storage.readUrl(storageKey),
      })),
    ),
  };
}
