'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * スクロールで要素を現す。
 *
 * サーバーが返す HTML は常に表示状態です。CSS で最初から隠すと、
 * JavaScript が動かなかったときに内容が永久に見えなくなります。
 * 隠すのは「クライアントで動く」と分かってからで、しかも画面の外にある
 * 要素だけです。画面内の要素を一度隠すと、読み込み直後にちらつきます。
 *
 * 状態ではなくクラスを直接付け外ししているのは、この用途では再描画が
 * 不要なためです（見た目だけが変わる）。
 *
 * 一度現したら監視を外します。上へ戻るたびに再生し直すと、読み返すときに
 * 邪魔になるためです。
 */

type Direction = 'up' | 'left' | 'right' | 'none';

/*
 * Tailwind は文字列を走査してクラスを生成するため、ここは必ず
 * そのままの形で書いてください（組み立てると生成されません）。
 */
const HIDDEN: Record<Direction, string[]> = {
  up: ['opacity-0', 'translate-y-6'],
  left: ['opacity-0', '-translate-x-6'],
  right: ['opacity-0', 'translate-x-6'],
  none: ['opacity-0'],
};

export function Reveal({
  children,
  className,
  /** 表示までの待ち時間(ms)。並んだ要素をずらして出すのに使います。 */
  delay = 0,
  direction = 'up',
  as: Tag = 'div',
  id,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: Direction;
  as?: 'div' | 'section' | 'li' | 'span' | 'article';
  id?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // 動きを減らす設定の人、観測できない環境では、隠さずそのまま出す。
    if (
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    // すでに画面に入っているものは触らない（ちらつきの原因になる）。
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;

    const hiddenClasses = HIDDEN[direction];
    el.classList.add(...hiddenClasses);
    if (delay) el.style.transitionDelay = `${delay}ms`;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          el.classList.remove(...hiddenClasses);
          observer.unobserve(entry.target);
        }
      },
      // 少し手前で始める。画面の端に触れてから動き出すと、出遅れて見える。
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [direction, delay]);

  return (
    <Tag
      id={id}
      ref={ref as React.Ref<never>}
      className={cn(
        'motion-safe:transition-[opacity,transform] motion-safe:duration-[620ms] motion-safe:ease-out',
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/**
 * セクションまるごとを現す版。
 *
 * <section> を置き換えて使うため、id や背景色の指定はそのまま渡します。
 * 背景だけ先に出て中身が遅れて現れると帯だけが見えるので、
 * 背景と中身は一緒に動かしています。
 */
export function RevealSection({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  // id はヘッダーのアンカーリンク（#how など）が指すため、section に残す。
  return (
    <Reveal as="section" id={id} className={cn('scroll-mt-20', className)}>
      {children}
    </Reveal>
  );
}
