'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';

/** 既読にしたことを知らせる合図。通知画面から送られます。 */
export const NOTICES_READ_EVENT = 'rakuraku:notices-read';

/**
 * 未読件数つきのベル。
 *
 * 件数はサーバーから受け取りますが、既読にした直後だけは画面側で 0 にします。
 * ここで画面全体を作り直すと、通知一覧が「未読のみ」で描き直され、
 * 開いた本人が読む前に消えてしまうためです。
 * 次にページを移ったときは、サーバーの値がそのまま正しくなります。
 */
export function NoticeBell({ count }: { count: number }) {
  const [unread, setUnread] = useState(count);

  // サーバーから新しい件数が来たら合わせる（他の画面へ移ったとき）。
  const [lastFromServer, setLastFromServer] = useState(count);
  if (count !== lastFromServer) {
    setLastFromServer(count);
    setUnread(count);
  }

  useEffect(() => {
    const clear = () => setUnread(0);
    window.addEventListener(NOTICES_READ_EVENT, clear);
    return () => window.removeEventListener(NOTICES_READ_EVENT, clear);
  }, []);

  return (
    <Link
      href="/notifications"
      className="text-brand hover:bg-brand-tint relative grid size-10 place-items-center rounded-full transition-colors"
      aria-label={unread > 0 ? `通知 ${unread}件` : '通知'}
    >
      <Bell className="size-[22px]" strokeWidth={1.6} aria-hidden />
      {unread > 0 && (
        <span
          className="bg-accent absolute top-1 right-1 grid size-[16px] place-items-center rounded-full text-[9px] font-bold text-white"
          aria-hidden
        >
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  );
}
