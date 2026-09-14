import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { exportLedgerExcel } from '@/lib/export/excel';
import { exportLedgerPdf } from '@/lib/export/pdf';
import { buildDenshiNouhinZip, NonCompliantPhotoError, MissingPhotoFileError } from '@/lib/export/denshi-nouhin';
import { loadLedgerData } from '@/lib/export/ledger-source';
import { getSessionContext } from '@/lib/auth/session';
import { capabilitiesForProject } from '@/lib/queries/projects';
import { recordAudit, auditRequestInfo } from '@/lib/audit';
import type { Capability } from '@/lib/acl/capabilities';
import type { PhotosPerPage } from '@/lib/export/types';

export const runtime = 'nodejs';
/** PDF は Chromium を起動するため、既定のタイムアウトでは足りないことがある。 */
export const maxDuration = 120;

type Format = 'excel' | 'pdf' | 'nouhin';

const SPEC: Record<Format, { capability: Capability; contentType: string; extension: string; audit: 'export.excel' | 'export.pdf' | 'export.denshi_nouhin' }> = {
  excel: {
    capability: 'export.excel',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    extension: 'xlsx',
    audit: 'export.excel',
  },
  pdf: {
    capability: 'export.pdf',
    contentType: 'application/pdf',
    extension: 'pdf',
    audit: 'export.pdf',
  },
  nouhin: {
    capability: 'export.denshi_nouhin',
    contentType: 'application/zip',
    extension: 'zip',
    audit: 'export.denshi_nouhin',
  },
};

const PER_PAGE = new Set([1, 3, 4, 6]);

/** RFC 5987 — 日本語のファイル名を安全に Content-Disposition に載せる。 */
function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string; format: string }> },
) {
  const { projectId, format } = await params;

  const spec = SPEC[format as Format];
  if (!spec) {
    return NextResponse.json({ error: '未対応の出力形式です。' }, { status: 404 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 });
  }

  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 });

  const capabilities = await capabilitiesForProject(ctx.user.id, projectId);
  if (!capabilities.has(spec.capability)) {
    return NextResponse.json({ error: 'この操作を行う権限がありません。' }, { status: 403 });
  }

  /*
   * どの形式でも写真の実体は要る。台帳に写真が載っていなければ提出物にならない。
   * ただし読むレンディションは分ける。電子納品は原本でなければ成果品として
   * 認められないが、PDF と Excel は表示用で足りる（原本を全部読むと
   * 大きな現場でメモリを使い切る）。
   */
  const url = new URL(request.url);
  // 不適合写真を外して出す運用があるため、除外 id を受け取る。
  const excludeIds = (url.searchParams.get('exclude') ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 5000);

  const data = await loadLedgerData(ctx.organization.id, projectId, {
    includeBytes: true,
    bytesFrom: format === 'nouhin' ? 'original' : 'display',
    excludeIds,
  });
  if (!data) {
    return NextResponse.json({ error: '現場が見つかりません。' }, { status: 404 });
  }

  if (data.photos.length === 0) {
    return NextResponse.json({ error: '出力対象の写真がありません。' }, { status: 400 });
  }

  const perPageRaw = Number(url.searchParams.get('perPage') ?? 4);
  const photosPerPage = (PER_PAGE.has(perPageRaw) ? perPageRaw : 4) as PhotosPerPage;
  // 社内用モードは適合チェックを外す。公共工事の提出物では使わせない。
  const internalMode = url.searchParams.get('mode') === 'internal';

  try {
    let body: Buffer;
    if (format === 'excel') {
      body = await exportLedgerExcel(data, { photosPerPage });
    } else if (format === 'pdf') {
      body = await exportLedgerPdf(data, { photosPerPage });
    } else {
      body = await buildDenshiNouhinZip(data, { enforceCompliance: !internalMode });
    }

    await recordAudit({
      organizationId: ctx.organization.id,
      actorId: ctx.user.id,
      actorName: ctx.user.name,
      actorEmail: ctx.user.email,
      action: spec.audit,
      targetType: 'project',
      targetId: projectId,
      targetLabel: data.project.name,
      projectId,
      metadata: { photoCount: data.photos.length, photosPerPage, internalMode, excludedCount: excludeIds.length },
      ...auditRequestInfo(request),
    });

    const filename = `${data.project.name}_工事写真台帳.${spec.extension}`;
    return new NextResponse(new Uint8Array(body), {
      headers: {
        'Content-Type': spec.contentType,
        'Content-Disposition': contentDisposition(filename),
        'Content-Length': String(body.byteLength),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    if (error instanceof MissingPhotoFileError) {
      return NextResponse.json({ error: error.message, photos: error.photos }, { status: 422 });
    }
    if (error instanceof NonCompliantPhotoError) {
      // 適合しない写真がある場合は 409。画面側でどれを外すか案内できるよう詳細を返す。
      return NextResponse.json(
        { error: error.message, photos: error.photos },
        { status: 409 },
      );
    }
    console.error('[export] failed', { format, projectId, error });
    return NextResponse.json({ error: '出力に失敗しました。' }, { status: 500 });
  }
}
