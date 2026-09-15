'use server';

import { requireSession } from '@/lib/auth/session';
import { markNoticesRead } from '@/lib/queries/notifications';

/**
 * 開いたお知らせを既読にする。
 *
 * 描画の途中ではなく、開いたあとに明示的に呼びます。描画中に既読にすると、
 * ヘッダー（レイアウト）の未読件数は並行して先に読まれるため、
 * 「開いたのにベルの数字が減らない」状態になります。
 *
 * ここで revalidatePath は呼びません。サーバーアクションの結果として
 * 今いる画面が描き直され、通知一覧（未読のみ）がその場で空になって、
 * 開いた本人が読む前に消えてしまうためです。
 * 通知画面は force-dynamic なので、次に開いたときには新しい状態になります。
 * 目の前のベルは画面側で 0 にします。
 */
export async function markNoticesReadAction(noticeIds: string[]): Promise<void> {
  const { user, organization } = await requireSession();
  if (noticeIds.length === 0) return;

  await markNoticesRead(organization.id, user.id, noticeIds);
}
