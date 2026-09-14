import { cache } from 'react';
import { notFound, redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import { auth } from '@/auth';

export type PlatformAdmin = {
  id: string;
  name: string;
  email: string;
};

/**
 * 運営管理者かどうかを確かめる。
 *
 * ここだけはテナントの境界を越えるため、セッションの中身を信用せず
 * 毎回データベースの is_platform_admin を読み直します。
 * トークンに焼き込むと、権限を剥奪しても有効期限まで管理画面に入れてしまいます。
 */
export const getPlatformAdmin = cache(async (): Promise<PlatformAdmin | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      isActive: users.isActive,
      isPlatformAdmin: users.isPlatformAdmin,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!row || !row.isActive || !row.isPlatformAdmin) return null;

  return { id: row.id, name: row.name ?? row.email, email: row.email };
});

/**
 * 管理画面用の門番。
 *
 * 未ログインならログイン画面へ、ログイン済みだが権限がなければ 404 を返します。
 * ログイン済みの人をログイン画面へ送り返すと、「入れているのにまたログイン」と
 * 見えて混乱します。また 404 にしておくことで、顧客に管理画面の存在を
 * わざわざ知らせずに済みます。
 */
export async function requirePlatformAdmin(returnTo = '/admin'): Promise<PlatformAdmin> {
  const admin = await getPlatformAdmin();
  if (admin) return admin;

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(returnTo)}`);
  }
  notFound();
}
