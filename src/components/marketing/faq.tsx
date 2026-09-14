'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const FAQS = [
  {
    q: '本当に写真を撮るだけで台帳は作成されますか？',
    a: 'はい。写真を撮影するだけで、AIが自動で整理・分類し、台帳を自動作成します。従来の手作業と比べて大幅に時間を削減できます。',
  },
  {
    q: 'セキュリティは安全ですか？',
    a: '通信・保存ともに暗号化し、案件ごと・権限ごとにアクセスを制御します。操作履歴はすべて監査ログに記録され、誰がいつ何をしたかを後から確認できます。',
  },
  {
    q: 'どれくらい作業時間を削減できますか？',
    a: '撮影から台帳出力までの一連の作業が自動化されるため、事務所に戻ってからの整理・貼り付け作業が不要になります。',
  },
  {
    q: 'どのデバイスで利用できますか？',
    a: 'スマートフォン・タブレットでの撮影と、PCブラウザでの整理・台帳作成に対応しています。圏外の現場でもオフラインで撮影でき、電波が戻り次第自動で同期します。',
  },
  {
    q: 'クラウドはどこからでもアクセスできますか？',
    a: 'インターネット環境があればどこからでもアクセスできます。IPアドレス制限にも対応しているため、社内ネットワークからのみ許可する運用も可能です。',
  },
];

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <ul className="mx-auto mt-12 max-w-[860px] space-y-3">
      {FAQS.map((item, i) => {
        const open = openIndex === i;
        return (
          <li
            key={item.q}
            className={cn(
              'overflow-hidden rounded-[12px] border transition-colors',
              open ? 'border-border-subtle bg-white shadow-sm' : 'border-transparent bg-brand-tint',
            )}
          >
            <h3>
              <button
                type="button"
                onClick={() => setOpenIndex(open ? null : i)}
                aria-expanded={open}
                className="flex w-full items-center gap-4 px-6 py-5 text-left"
              >
                <span className="text-brand-link text-[32px] leading-none font-bold sm:text-[40px]">Q.</span>
                <span className="text-brand flex-1 text-[17px] font-bold sm:text-[19px]">
                  {item.q}
                </span>
                <ChevronDown
                  className={cn('text-brand-link size-5 shrink-0 transition-transform', open && 'rotate-180')}
                  aria-hidden
                />
              </button>
            </h3>
            {open && (
              <div className="flex gap-4 px-6 pb-6">
                <span className="text-accent text-[32px] leading-none font-bold sm:text-[40px]">A.</span>
                <p className="flex-1 text-[15px] leading-[2] text-ink">{item.a}</p>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
