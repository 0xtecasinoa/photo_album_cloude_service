'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ImageOff } from 'lucide-react';
import { cn, formatDateOnly } from '@/lib/utils';

/** 1ページ配置枚数 — 工事写真台帳で一般的な体裁。 */
const PER_PAGE = [1, 3, 4, 6] as const;

const GRID_FOR: Record<(typeof PER_PAGE)[number], string> = {
  1: 'grid-cols-1',
  3: 'grid-cols-1',
  4: 'grid-cols-1 xl:grid-cols-2',
  6: 'grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3',
};

/*
 * 1段に何枚並べるかで、写真と写真情報の置き方を変える。
 * 2列・3列のときに横並びのままにすると、写真情報の幅が数十pxしか残らず、
 * 「施工状況写真」が一文字ずつ縦に折り返してしまう。
 */
const SIDE_BY_SIDE: Record<(typeof PER_PAGE)[number], boolean> = {
  1: true, 3: true, 4: false, 6: false,
};

export type LedgerPreviewPhoto = {
  id: string;
  takenAt: Date;
  category: string | null;
  workType: string | null;
  workDetail: string | null;
  title: string | null;
  shootingLocation: string | null;
  contractorNote: string | null;
  controlValue: string | null;
  imageUrl: string;
};

/**
 * 台帳の1項目。
 *
 * 幅が足りないときは値を次の行へ送る（flex-wrap）。折り返しを許さないと、
 * 狭い列で「施」「工」「状」「況」…と一文字ずつ縦に割れてしまう。
 */
function LedgerField({
  label,
  value,
  tabular,
}: {
  label: string;
  value: string | null;
  tabular?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex flex-wrap gap-x-1">
      <dt className="whitespace-nowrap">{label}：</dt>
      <dd className={cn('min-w-0 break-words', tabular && 'tabular')}>{value}</dd>
    </div>
  );
}

export function LedgerLayoutPicker({ photos }: { photos: LedgerPreviewPhoto[] }) {
  const [perPage, setPerPage] = useState<(typeof PER_PAGE)[number]>(4);

  if (photos.length === 0) {
    return (
      <div className="px-8 pt-10 xl:px-[31px]">
        <div className="border-border-subtle grid place-items-center rounded-[14px] border border-dashed bg-white px-6 py-20 text-center">
          <ImageOff className="text-brand/30 size-10" strokeWidth={1.3} aria-hidden />
          <h2 className="mt-4 text-[15px] font-bold text-ink">写真がまだありません</h2>
          <p className="text-ink-muted mt-2 text-[13px]">
            現場の写真を取り込むと、ここに台帳の体裁で表示されます。
          </p>
        </div>
      </div>
    );
  }

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

      <div className={cn('grid gap-x-10 gap-y-12 px-8 pt-10 pb-16 xl:px-[31px]', GRID_FOR[perPage])}>
        {photos.map((photo) => (
          <article
            key={photo.id}
            className={cn('flex flex-col gap-6', SIDE_BY_SIDE[perPage] && 'sm:flex-row sm:gap-7')}
          >
            <Image
              src={photo.imageUrl}
              alt={[photo.category, photo.workDetail, photo.title].filter(Boolean).join(' ') || '工事写真'}
              width={362}
              height={250}
              unoptimized
              className={cn(
                'bg-surface-sunken h-[250px] w-full rounded-[10px] object-cover',
                SIDE_BY_SIDE[perPage] && 'sm:w-[362px] sm:shrink-0',
              )}
            />

            <div className="min-w-0 flex-1">
              <div className="bg-success-tint rounded-[8px] px-6 py-5">
                <p className="text-success text-[14px] font-bold">写真情報</p>
                <dl className="mt-3 space-y-1.5 text-[13px] text-ink">
                  <LedgerField label="撮影年月日" value={formatDateOnly(photo.takenAt)} tabular />
                  <LedgerField label="写真区分" value={photo.category} />
                  <LedgerField label="工種" value={photo.workType} />
                  <LedgerField label="撮影箇所" value={photo.shootingLocation} />
                  <LedgerField label="施工管理値" value={photo.controlValue} />
                </dl>
              </div>

              {(photo.title || photo.contractorNote) && (
                <p className="mt-6 text-[14px] leading-[2] text-ink">
                  {photo.title && <span className="font-bold">{photo.title}　</span>}
                  {photo.contractorNote}
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
