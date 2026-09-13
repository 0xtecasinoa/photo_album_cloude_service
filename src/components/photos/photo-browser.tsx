'use client';

import { useState } from 'react';
import { Search, LayoutGrid, List, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FilterRail } from './filter-rail';
import { PhotoCard } from './photo-card';
import type { DemoPhoto } from '@/lib/demo-data';

const ACTIVE_FILTERS = [
  '撮影日：2024/04/01 - 2024/04/30',
  '工種：鉄筋工',
  'AI状態：解析済み',
];

export function PhotoBrowser({ photos }: { photos: DemoPhoto[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelected = photos.length > 0 && selected.size === photos.length;
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(photos.map((p) => p.id)));

  return (
    <>
      {/* Filter chips + search + view controls */}
      <div className="border-border-subtle border-b px-8 py-[13px] xl:px-[31px]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="bg-brand-tint min-w-0 rounded-[8px] px-3.5 py-2.5">
            <p className="text-brand text-[11px] font-bold">適用中のフィルター</p>
            <ul className="mt-1.5 flex flex-wrap gap-2">
              {ACTIVE_FILTERS.map((f) => (
                <li key={f}>
                  <button
                    type="button"
                    className="border-brand/25 text-brand flex items-center gap-1.5 rounded-[5px] border bg-white px-2 py-1 text-[11px]"
                  >
                    <span className="tabular">{f}</span>
                    <X className="size-3" aria-hidden />
                    <span className="sr-only">このフィルターを外す</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap items-end gap-5">
            <div className="relative">
              <Search
                className="text-ink-muted pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
                aria-hidden
              />
              <input
                type="search"
                placeholder="写真・看板の文字を検索"
                aria-label="写真・看板の文字を検索"
                className="border-border focus:border-brand focus:outline-brand-ring/40 h-10 w-[278px] max-w-full rounded-[30px] border pr-4 pl-10 text-[13px] focus:outline-2"
              />
            </div>

            <div>
              <p className="text-brand mb-1.5 text-[11px] font-bold">表示</p>
              <div className="border-border flex h-[30px] overflow-hidden rounded-[6px] border">
                <button
                  type="button"
                  onClick={() => setView('grid')}
                  aria-pressed={view === 'grid'}
                  aria-label="グリッド表示"
                  className={cn(
                    'grid w-10 place-items-center transition-colors',
                    view === 'grid' ? 'bg-brand text-white' : 'text-ink-muted bg-white',
                  )}
                >
                  <LayoutGrid className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setView('list')}
                  aria-pressed={view === 'list'}
                  aria-label="リスト表示"
                  className={cn(
                    'border-border grid w-10 place-items-center border-l transition-colors',
                    view === 'list' ? 'bg-brand text-white' : 'text-ink-muted bg-white',
                  )}
                >
                  <List className="size-4" aria-hidden />
                </button>
              </div>
            </div>

            <div>
              <p className="text-brand mb-1.5 text-[11px] font-bold">並び替え</p>
              <button
                type="button"
                className="border-border h-[30px] rounded-[6px] border px-3 text-[12px] text-ink"
              >
                すべてクリア
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-6 px-8 pt-6 xl:px-[31px]">
        <div className="hidden lg:block">
          <FilterRail />
        </div>

        <div className="border-border-subtle min-w-0 flex-1 lg:border-l lg:pl-12">
          <label className="mb-4 inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="peer sr-only"
            />
            <span
              className={cn(
                'grid size-[22px] place-items-center rounded-[4px] border-2 transition-colors',
                'peer-focus-visible:outline-brand-ring peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2',
                allSelected ? 'bg-brand border-brand' : 'border-border bg-white',
              )}
            >
              {allSelected && (
                <svg viewBox="0 0 14 14" className="size-3.5 text-white" aria-hidden>
                  <path
                    d="M2 7.5 5.5 11 12 3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
            <span className="text-[12px] text-ink-muted">
              {selected.size > 0 ? `${selected.size}枚を選択中` : 'すべて選択'}
            </span>
          </label>

          <div
            className={cn(
              'grid gap-x-[43px] gap-y-[25px]',
              view === 'grid'
                ? 'grid-cols-[repeat(auto-fill,minmax(231px,1fr))]'
                : 'grid-cols-1 md:grid-cols-2',
            )}
          >
            {photos.map((photo) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                selected={selected.has(photo.id)}
                onToggle={toggle}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
