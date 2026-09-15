'use client';

import { useEffect, useRef } from 'react';
import { markNoticesReadAction } from './actions';
import { NOTICES_READ_EVENT } from '@/components/app/notice-bell';

/**
 * 画面を開いたら既読にする。
 *
 * 既読にしたあと画面を作り直すことはしません。一覧は「未読のみ」を
 * 出しているので、作り直すと開いた本人が読む前に消えてしまいます。
 * その場で変えるのはベルの数字だけにして、一覧は次に開いたときから
 * 新しい状態になります。
 */
export function MarkNoticesRead({ noticeIds }: { noticeIds: string[] }) {
  // 同じ内容で二重に送らないための目印。
  const sent = useRef('');

  useEffect(() => {
    if (noticeIds.length === 0) return;
    const key = noticeIds.join(',');
    if (sent.current === key) return;
    sent.current = key;

    void markNoticesReadAction(noticeIds).then(() => {
      window.dispatchEvent(new Event(NOTICES_READ_EVENT));
    });
  }, [noticeIds]);

  return null;
}
