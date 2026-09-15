import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import { photos } from '@/db/schema';
import { storage } from '@/lib/storage';
import { recognizeBoard, isOcrAvailable } from './ocr';

/**
 * 写真に写っている小黒板を読み取り、管理項目を埋める。
 *
 * 取り込み時に同期で走らせません。1枚あたり1.5秒ほどかかるため、
 * 100枚まとめて入れると画面が数分固まります。取り込みは先に終わらせ、
 * 読み取りは後から回します。
 *
 * すでに人が入れた値は上書きしません。読み取りは下書きであり、
 * 現場が直した内容を機械が戻してしまうのが一番困るためです。
 */

/** 読み取り結果を写真のどの列に入れるか。 */
const FIELD_TO_COLUMN: Record<string, 'workType' | 'workKind' | 'workDetail' | 'shootingLocation' | 'controlValue' | 'designValue' | 'measuredValue' | 'title'> = {
  workType: 'workType',
  workKind: 'workKind',
  workDetail: 'workDetail',
  shootingLocation: 'shootingLocation',
  controlValue: 'controlValue',
  designValue: 'designValue',
  measuredValue: 'measuredValue',
  title: 'title',
};

export type AnalyzeResult = { analyzed: number; failed: number; skipped: number };

async function analyzeOne(photoId: string): Promise<'done' | 'failed' | 'skipped'> {
  const [photo] = await db
    .select({
      id: photos.id,
      storageKey: photos.storageKey,
      workType: photos.workType,
      workKind: photos.workKind,
      workDetail: photos.workDetail,
      shootingLocation: photos.shootingLocation,
      controlValue: photos.controlValue,
      designValue: photos.designValue,
      measuredValue: photos.measuredValue,
      title: photos.title,
    })
    .from(photos)
    .where(eq(photos.id, photoId))
    .limit(1);

  if (!photo) return 'skipped';

  const bytes = await storage.get(photo.storageKey).catch(() => null);
  if (!bytes) {
    await db
      .update(photos)
      .set({ ocrStatus: 'failed', ocrProcessedAt: new Date() })
      .where(eq(photos.id, photoId));
    return 'failed';
  }

  try {
    const result = await recognizeBoard(bytes);

    const patch: Record<string, string> = {};
    for (const field of result.fields) {
      const column = FIELD_TO_COLUMN[field.key];
      if (!column || !field.value) continue;
      // すでに入っている値は触らない。現場が直したものを戻さないため。
      if (photo[column]) continue;
      patch[column] = field.value;
    }

    await db
      .update(photos)
      .set({
        ...patch,
        ocrStatus: 'done',
        ocrText: result.rawText.slice(0, 4000),
        ocrConfidence: result.confidence,
        ocrProcessedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(photos.id, photoId));

    return 'done';
  } catch (error) {
    console.error('[analyze-photo] failed', { photoId, error });
    await db
      .update(photos)
      .set({ ocrStatus: 'failed', ocrProcessedAt: new Date() })
      .where(eq(photos.id, photoId));
    return 'failed';
  }
}

/**
 * 現場の未読み取りの写真をまとめて処理する。
 *
 * 1枚ずつ順に読みます。並列にすると tesseract のワーカーが同時に立ち上がり、
 * メモリを食い尽くして落ちます。
 */
export async function analyzeProjectPhotos(
  projectId: string,
  options: { limit?: number } = {},
): Promise<AnalyzeResult> {
  if (!isOcrAvailable()) {
    // 言語データが無いときは、読み取り対象外として記録する。
    // 「未解析」のまま残すと、いつまでも待っているように見える。
    await db
      .update(photos)
      .set({ ocrStatus: 'skipped', ocrProcessedAt: new Date() })
      .where(and(eq(photos.projectId, projectId), isNull(photos.deletedAt), eq(photos.ocrStatus, 'pending')));
    return { analyzed: 0, failed: 0, skipped: 1 };
  }

  const targets = await db
    .select({ id: photos.id })
    .from(photos)
    .where(
      and(
        eq(photos.projectId, projectId),
        isNull(photos.deletedAt),
        sql`${photos.ocrStatus} in ('pending', 'failed')`,
      ),
    )
    .limit(options.limit ?? 50);

  if (targets.length === 0) return { analyzed: 0, failed: 0, skipped: 0 };

  // 処理中であることを先に立てる。二重に走らせないため。
  await db
    .update(photos)
    .set({ ocrStatus: 'processing' })
    .where(inArray(photos.id, targets.map((t) => t.id)));

  const result: AnalyzeResult = { analyzed: 0, failed: 0, skipped: 0 };
  for (const target of targets) {
    const outcome = await analyzeOne(target.id);
    if (outcome === 'done') result.analyzed += 1;
    else if (outcome === 'failed') result.failed += 1;
    else result.skipped += 1;
  }

  return result;
}
