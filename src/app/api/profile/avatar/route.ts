import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import { db } from '@/db';
import { users } from '@/db/schema';
import { getSessionContext } from '@/lib/auth/session';
import { storage } from '@/lib/storage';
import { storageKeys } from '@/lib/storage/keys';

export const runtime = 'nodejs';

const ACCEPTED = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 8 * 1024 * 1024;
/** 一覧に出る大きさで足りる。原寸を持つと容量ばかり食う。 */
const SIZE = 256;

/**
 * 自分の顔写真を差し替える。
 *
 * 他人の分は変更できません（本人の id でしか書き込まない）。
 * 管理者が他人の顔写真を勝手に入れ替えられると、監査ログの
 * 「誰が」が信用できなくなります。
 */
export async function POST(request: Request) {
  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 });

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: '画像を選択してください。' }, { status: 400 });
  }
  if (!ACCEPTED.has(file.type)) {
    return NextResponse.json({ error: 'JPEG・PNG・WebP のみ使えます。' }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: '画像が大きすぎます（8MBまで）。' }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  // 正方形に切り出してから保存する。縦横比がまちまちだと一覧が揃わない。
  const square = await sharp(bytes, { failOn: 'none' })
    .rotate()
    .resize(SIZE, SIZE, { fit: 'cover', position: 'attention' })
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();

  const key = storageKeys.userAvatar(ctx.organization.id, ctx.user.id, 'jpg');
  await storage.put(key, square, 'image/jpeg');

  const url = await storage.readUrl(key);
  await db.update(users).set({ image: url, updatedAt: new Date() }).where(eq(users.id, ctx.user.id));

  return NextResponse.json({ url });
}
