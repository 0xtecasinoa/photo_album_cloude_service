import { NextResponse } from 'next/server';
import { collectAccessContext, recordAccess } from '@/lib/access-log/record';
import { looksLikeBot } from '@/lib/access-log/bot';

export const runtime = 'nodejs';

/**
 * 画面の閲覧を記録する。
 *
 * サーバー側の描画時ではなく、ブラウザから呼んでもらいます。
 * 公開したサーバーには自動の探索が絶え間なく来ますが、その多くは
 * HTML を取得するだけで JavaScript を動かしません。ブラウザから
 * 呼ぶ形にすると、そうした機械の分が最初から入らなくなります。
 *
 * 名乗りで分かる機械は、ここでも念のため弾きます。
 */
export async function POST(request: Request) {
  const access = await collectAccessContext();
  if (!access) return NextResponse.json({ ok: true });

  if (looksLikeBot(access.userAgent)) {
    return NextResponse.json({ ok: true, skipped: 'bot' });
  }

  // 画面側から渡されたパスを優先する。ヘッダーより確実。
  let path = access.path;
  try {
    const body = await request.json();
    if (typeof body?.path === 'string' && body.path.startsWith('/')) path = body.path;
  } catch {
    // 本文が無くてもヘッダーのパスで記録できる。
  }

  await recordAccess({ ...access, path });
  return NextResponse.json({ ok: true });
}
