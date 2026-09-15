import { after } from 'next/server';
import { collectAccessContext, recordAccess } from '@/lib/access-log/record';

/**
 * 画面の閲覧を記録するためだけの部品。見た目は持ちません。
 *
 * レイアウトに1つ置けば、その配下の画面すべてが記録されます。
 *
 * 必要な値は描画中に読み出し、書き込みだけを応答後に回します
 * （after() の中では headers() を呼べないため）。
 * こうすることで、記録のために画面表示を待たせずに済みます。
 */
export async function RecordAccess() {
  const access = await collectAccessContext();

  after(async () => {
    if (access) await recordAccess(access);
  });

  return null;
}
