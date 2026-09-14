import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { photos, projects } from '@/db/schema';
import { auth } from '@/auth';
import { getSessionContext } from '@/lib/auth/session';
import { capabilitiesForProject } from '@/lib/queries/projects';
import { processPhoto } from '@/lib/photo/process';
import { storage, storageKeys } from '@/lib/storage';
import { recordAudit, auditRequestInfo } from '@/lib/audit';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
/** 画像処理に時間がかかるため、既定のタイムアウトでは足りないことがある。 */
export const maxDuration = 300;

const ACCEPTED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

function extensionFor(mime: string, filename: string): string {
  const fromName = filename.split('.').pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  return mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 });
  }
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 });

  // 現場が自組織のものであることを先に確認する。権限だけ見ると、
  // 他社の現場IDを指定された場合に素通りしてしまう。
  const [project] = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.organizationId, ctx.organization.id)))
    .limit(1);
  if (!project) {
    return NextResponse.json({ error: '現場が見つかりません。' }, { status: 404 });
  }

  const capabilities = await capabilitiesForProject(ctx.user.id, projectId);
  if (!capabilities.has('photo.upload')) {
    return NextResponse.json({ error: '写真を追加する権限がありません。' }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'アップロードデータを読み取れませんでした。' }, { status: 400 });
  }

  const files = form.getAll('files').filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: 'ファイルが選択されていません。' }, { status: 400 });
  }

  const created: { id: string; filename: string }[] = [];
  const skipped: { filename: string; reason: string }[] = [];

  for (const file of files) {
    if (!ACCEPTED.has(file.type)) {
      skipped.push({ filename: file.name, reason: '対応していない形式です' });
      continue;
    }
    if (file.size > env.MAX_UPLOAD_BYTES) {
      skipped.push({ filename: file.name, reason: 'ファイルサイズが上限を超えています' });
      continue;
    }

    try {
      const bytes = Buffer.from(await file.arrayBuffer());
      const processed = await processPhoto(bytes);

      // 同じ写真の重複登録を防ぐ。まとめて取り込むと同じファイルが
      // 複数回選ばれることがあり、台帳に同じ写真が並んでしまう。
      const [dup] = await db
        .select({ id: photos.id })
        .from(photos)
        .where(
          and(
            eq(photos.projectId, projectId),
            eq(photos.contentHash, processed.contentHash),
          ),
        )
        .limit(1);
      if (dup) {
        skipped.push({ filename: file.name, reason: 'すでに登録済みの写真です' });
        continue;
      }

      const photoId = randomUUID();
      const orgId = ctx.organization.id;
      const ext = extensionFor(file.type, file.name);

      const originalKey = storageKeys.photoOriginal(orgId, projectId, photoId, ext);
      const displayKey = storageKeys.photoDisplay(orgId, projectId, photoId);
      const thumbKey = storageKeys.photoThumbnail(orgId, projectId, photoId);

      // 原本は無加工のまま保存する。再エンコードすると改ざん検知の
      // 署名が壊れ、電子納品にも使えなくなる。
      await storage.put(originalKey, bytes, file.type);
      await storage.put(displayKey, processed.display.buffer, 'image/jpeg');
      await storage.put(thumbKey, processed.thumbnail.buffer, 'image/jpeg');

      await db.insert(photos).values({
        id: photoId,
        organizationId: orgId,
        projectId,
        storageKey: displayKey,
        originalStorageKey: originalKey,
        thumbnailKey: thumbKey,
        originalFilename: file.name,
        mimeType: file.type,
        fileSize: bytes.byteLength,
        contentHash: processed.contentHash,
        width: processed.width,
        height: processed.height,
        // EXIF がなければアップロード時刻で代用し、由来を記録しておく。
        takenAt: processed.exif.takenAt ?? new Date(),
        takenAtSource: processed.exif.takenAt ? 'exif' : 'upload',
        latitude: processed.exif.latitude,
        longitude: processed.exif.longitude,
        altitude: processed.exif.altitude,
        exif: processed.exif.raw ?? undefined,
        uploadedById: ctx.user.id,
        uploadSource: 'web_upload',
        // ブラウザからの取り込みは小黒板の署名がないため、電子納品には使えない。
        integrityStatus: 'unsigned',
      });

      created.push({ id: photoId, filename: file.name });
    } catch (error) {
      console.error('[upload] failed', { filename: file.name, error });
      skipped.push({ filename: file.name, reason: '読み込みに失敗しました' });
    }
  }

  if (created.length > 0) {
    await recordAudit({
      organizationId: ctx.organization.id,
      actorId: ctx.user.id,
      actorName: ctx.user.name,
      actorEmail: ctx.user.email,
      action: 'photo.upload',
      targetType: 'project',
      targetId: projectId,
      targetLabel: project.name,
      projectId,
      metadata: { created: created.length, skipped: skipped.length },
      ...auditRequestInfo(request),
    });
  }

  return NextResponse.json({ created, skipped }, { status: created.length ? 201 : 400 });
}
