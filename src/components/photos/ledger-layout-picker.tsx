'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { DemoPhoto } from '@/lib/demo-data';

/** 1ページ配置枚数 — the standard Japanese 工事写真台帳 page densities. */
const PER_PAGE = [1, 3, 4, 6] as const;

const GRID_FOR: Record<(typeof PER_PAGE)[number], string> = {
  1: 'grid-cols-1',
  3: 'grid-cols-1',
  4: 'grid-cols-1 xl:grid-cols-2',
  6: 'grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3',
};

export function LedgerLayoutPicker({ photos }: { photos: DemoPhoto[] }) {
  const [perPage, setPerPage] = useState<(typeof PER_PAGE)[number]>(1);

  return (
    <>
      <div className="border-border-subtle border-b px-8 py-5 xl:px-[31px]">
        <p className="text-brand mb-2.5 text-[11px] font-bold">1ページ配置枚数</p>
        <div role="radiogroup" aria-label="1ページ配置枚数" className="flex gap-3">
          {PER_PAGE.map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={perPage === n}
              onClick={() => setPerPage(n)}
              className={cn(
                'h-[33px] w-[47px] rounded-[6px] border text-[13px] transition-colors',
                perPage === n
                  ? 'border-brand bg-brand text-white'
                  : 'border-brand/35 text-brand bg-white hover:bg-brand-tint',
              )}
            >
              {n}枚
            </button>
          ))}
        </div>
      </div>

      <div className={cn('grid gap-x-10 gap-y-12 px-8 pt-10 xl:px-[31px]', GRID_FOR[perPage])}>
        {photos.slice(0, perPage === 1 ? 3 : perPage).map((photo) => (
          <article key={photo.id} className="flex flex-col gap-7 sm:flex-row">
            <div
              className="h-[250px] w-full shrink-0 rounded-[10px] sm:w-[362px]"
              style={{ backgroundColor: photo.thumbnailTone }}
              role="img"
              aria-label={`${photo.category} ${photo.workDetail} の写真`}
            />

            <div className="min-w-0 flex-1">
              <div className="bg-success-tint rounded-[8px] px-6 py-5">
                <p className="text-success text-[14px] font-bold">AI抽出データ</p>
                <dl className="mt-3 space-y-1.5 text-[13px] text-ink">
                  <div className="flex gap-1">
                    <dt className="shrink-0">工事名：</dt>
                    <dd className="truncate">{photo.extracted.projectName}</dd>
                  </div>
                  <div className="flex gap-1">
                    <dt className="shrink-0">部位：</dt>
                    <dd className="truncate">{photo.extracted.part}</dd>
                  </div>
                  <div className="flex gap-1">
                    <dt className="shrink-0">内容：</dt>
                    <dd className="truncate">{photo.extracted.content}</dd>
                  </div>
                </dl>
              </div>

              <p className="mt-6 text-[14px] leading-[2] text-ink">
                <span className="font-bold">【AI下書き】</span>
                No.8＋12.0m地点における構造物掘削工の床掘高さ検測。手書き看板「H＝2.50m」に対し
                「H＝2.51m」を検測し良好。
              </p>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
