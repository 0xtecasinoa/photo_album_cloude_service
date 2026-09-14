import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { resolveShareLink, readSharedPhotoBytes } from '@/lib/queries/share-links';
import { shareCookieName, shareCookieMatches } from '@/lib/share/auth';

export const runtime = 'nodejs';

const VARIANTS = new Set(['thumb', 'display', 'original']);

/** RFC 5987 — 日本語のファイル名を安全に Content-Disposition に載せる。 */
function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

/**
 * 共有リンク越しの画像配信。
 *
 * 画像1枚ごとにリンクの状態を見ます。取り消しても、ページを開いたままの
 * 相手が画像を読み続けられる、という状態を作らないためです。
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string; photoId: string }> },
) {
  const { token, photoId } = await params;

  const link = await resolveShareLink(token);
  if (link.status !== 'ok') {
    return NextResponse.json({ error: 'このリンクは利用できません。' }, { status: 404 });
  }

  if (link.requiresPassword) {
    const store = await cookies();
    const ok = shareCookieMatches(
      store.get(shareCookieName(link.id))?.value,
      link.id,
      link.passwordHash!,
    );
    if (!ok) return NextResponse.json({ error: 'パスワードが必要です。' }, { status: 401 });
  }

  const url = new URL(request.url);
  const requested = url.searchParams.get('v') ?? 'display';
  const variant = (VARIANTS.has(requested) ? requested : 'display') as
    | 'thumb'
    | 'display'
    | 'original';

  // 原本はダウンロード許可がある場合だけ。表示用なら閲覧のみのリンクでも出す。
  if (variant === 'original' && !link.allowDownload) {
    return NextResponse.json({ error: 'ダウンロードは許可されていません。' }, { status: 403 });
  }

  const file = await readSharedPhotoBytes(link.projectId, photoId, variant);
  if (!file) {
    return NextResponse.json({ error: '写真が見つかりません。' }, { status: 404 });
  }

  const download = url.searchParams.get('download') === '1' && link.allowDownload;

  return new NextResponse(new Uint8Array(file.bytes), {
    headers: {
      'Content-Type': file.contentType,
      'Content-Length': String(file.bytes.byteLength),
      // 取り消しが効かなくなるため、共有画像はキャッシュさせない。
      'Cache-Control': 'no-store, private',
      ...(download ? { 'Content-Disposition': contentDisposition(file.filename) } : {}),
    },
  });
}
