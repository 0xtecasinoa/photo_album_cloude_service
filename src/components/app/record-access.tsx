'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * 画面の閲覧を記録するためだけの部品。見た目は持ちません。
 *
 * 記録はサーバーの描画時ではなく、ここ（ブラウザ）から依頼します。
 *
 * 公開したサーバーには自動の探索が絶え間なく来ますが、その多くは
 * HTML を取得するだけで JavaScript を動かしません。描画時に記録すると
 * それらが全部残り、実際に使っている人の記録が埋もれます。
 * ブラウザから依頼する形にすると、機械の分が最初から入りません。
 *
 * 記録できなくても画面には影響させません。記録が取れないことより、
 * 画面が動かないことのほうが困るためです。
 */
export function RecordAccess() {
  const pathname = usePathname();
  // 同じ画面で二重に送らないための目印。
  const sent = useRef<string>('');

  useEffect(() => {
    if (!pathname || sent.current === pathname) return;
    sent.current = pathname;

    void fetch('/api/access-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname }),
      // 画面を離れても送り切る。
      keepalive: true,
    }).catch(() => {
      // 記録できなくても画面は動かす。
    });
  }, [pathname]);

  return null;
}
