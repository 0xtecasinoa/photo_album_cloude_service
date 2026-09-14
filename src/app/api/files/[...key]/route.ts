import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { storage, assertSafeKey, organizationIdFromKey } from '@/lib/storage';
import { getSessionContext } from '@/lib/auth/session';

export const runtime = 'nodejs';

/**
 * ローカル保存時のファイル配信。
 *
 * S3 を使う場合は期限付き URL が直接発行されるため、この経路は通りません。
 * ローカル保存には期限付き URL の仕組みがないので、代わりにここで
 * セッションと所属組織を確認します。確認せずに静的配信すると、
 * URL を知っている人は誰でも他社の工事写真を読めてしまいます。
 */

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
  gif: 'image/gif', pdf: 'application/pdf', zip: 'application/zip',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

function contentTypeFor(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase() ?? '';
  return CONTENT_TYPES[ext] ?? 'application/octet-stream';
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  const { key: segments } = await params;
  const key = segments.join('/');

  try {
    assertSafeKey(key);
  } catch {
    return NextResponse.json({ error: '不正なパスです。' }, { status: 400 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 });
  }

  const ctx = await getSessionContext();
  if (!ctx) {
    return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 });
  }

  const ownerOrgId = organizationIdFromKey(key);
  if (!ownerOrgId) {
    return NextResponse.json({ error: '不正なパスです。' }, { status: 400 });
  }

  /*
   * 自社のファイルのみ許可する。
   * TODO: 協力会社（別組織）からの閲覧は project_members を見て許可する。
   * 現状は拒否側に倒してある。誤って許可するより、見られない不便のほうが軽い。
   */
  if (ownerOrgId !== ctx.organization.id) {
    // 存在の有無を伝えないため 403 ではなく 404 を返す。
    return NextResponse.json({ error: 'ファイルが見つかりません。' }, { status: 404 });
  }

  if (!(await storage.exists(key))) {
    return NextResponse.json({ error: 'ファイルが見つかりません。' }, { status: 404 });
  }

  const body = await storage.get(key);
  return new NextResponse(new Uint8Array(body), {
    headers: {
      'Content-Type': contentTypeFor(key),
      'Content-Length': String(body.byteLength),
      // 権限を外した直後に古いキャッシュから読めないよう、共有キャッシュは無効にする。
      'Cache-Control': 'private, max-age=60',
    },
  });
}
