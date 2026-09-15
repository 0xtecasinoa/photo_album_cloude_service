'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, X, LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils';
import { INTEGRITY_LABELS, SOURCE_LABELS } from './filter-rail';

const SORTS = [
  { key: 'takenAsc', label: '撮影日が古い順' },
  { key: 'takenDesc', label: '撮影日が新しい順' },
  { key: 'uploadedDesc', label: '取り込みが新しい順' },
  { key: 'titleAsc', label: '写真タイトル順' },
];

const OCR_LABELS: Record<string, string> = { done: 'AI解析済み', undone: '未解析' };

/** 表示中の絞り込みを、人が読む言葉に直す。 */
function describe(param: string, value: string): string | null {
  switch (param) {
    case 'q':
      return `検索: ${value}`;
    case 'workType':
      return `工種: ${value}`;
    case 'workKind':
      return `種別: ${value}`;
    case 'workDetail':
      return `細別: ${value}`;
    case 'category':
      return `写真区分: ${value}`;
    case 'integrity':
      return `署名: ${INTEGRITY_LABELS[value] ?? value}`;
    case 'source':
      return `出所: ${SOURCE_LABELS[value] ?? value}`;
    case 'ocr':
      return `AI状態: ${OCR_LABELS[value] ?? value}`;
    case 'tag':
      return `タグ: ${value}`;
    case 'from':
      return `撮影日 開始: ${value}`;
    case 'to':
      return `撮影日 終了: ${value}`;
    default:
      // 表示方法や並び順は「絞り込み」ではないので出さない。
      return null;
  }
}

export function PhotoToolbar({
  total,
  view,
  onViewChange,
}: {
  total: number;
  view: 'grid' | 'list';
  onViewChange: (v: 'grid' | 'list') => void;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(params.get('q') ?? '');

  const chips = [...params.entries()]
    .map(([param, value]) => ({ param, value, label: describe(param, value) }))
    .filter((c): c is { param: string; value: string; label: string } => c.label !== null);

  const withoutChip = (param: string) => {
    const next = new URLSearchParams(params.toString());
    next.delete(param);
    return `${pathname}${next.toString() ? `?${next}` : ''}`;
  };

  const submitSearch = (value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value.trim()) next.set('q', value.trim());
    else next.delete('q');
    router.push(`${pathname}${next.toString() ? `?${next}` : ''}`);
  };

  const setSort = (value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set('sort', value);
    else next.delete('sort');
    router.push(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="border-border-subtle border-b px-8 py-5 xl:px-[31px]">
      {chips.length > 0 && (
        <div className="bg-brand-tint/60 mb-4 flex flex-wrap items-center gap-2 rounded-[10px] px-4 py-3">
          <span className="text-brand text-[12px] font-bold">適用中のフィルター</span>
          {chips.map((c) => (
            <Link
              key={`${c.param}:${c.value}`}
              href={withoutChip(c.param)}
              className="border-brand-ring/40 text-brand hover:bg-brand/10 flex items-center gap-1.5 rounded-[30px] border bg-white px-3 py-1 text-[12px] transition-colors"
            >
              {c.label}
              <X className="size-3" aria-hidden />
              <span className="sr-only">この絞り込みを外す</span>
            </Link>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-ink-muted text-[13px]">
          全 <span className="tabular text-brand font-bold">{total.toLocaleString('ja-JP')}</span> 枚
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitSearch(query);
            }}
            className="relative"
          >
            <Search
              className="text-ink-muted pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="写真・看板の文字を検索"
              aria-label="写真・看板の文字を検索"
              className="border-border focus:border-brand focus:outline-brand-ring/40 h-10 w-[260px] max-w-full rounded-[30px] border pr-4 pl-10 text-[13px] focus:outline-2"
            />
          </form>

          <div className="flex items-center gap-2">
            <label htmlFor="photo-sort" className="text-ink-muted text-[12px]">並び替え</label>
            <select
              id="photo-sort"
              value={params.get('sort') ?? 'takenAsc'}
              onChange={(e) => setSort(e.target.value)}
              className="border-border focus:border-brand h-10 rounded-[8px] border bg-white px-3 text-[13px] focus:outline-none"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-ink-muted text-[12px]">表示</span>
            <div className="border-border flex overflow-hidden rounded-[8px] border">
              <button
                type="button"
                onClick={() => onViewChange('grid')}
                aria-pressed={view === 'grid'}
                aria-label="グリッド表示"
                className={cn('grid size-9 place-items-center', view === 'grid' ? 'bg-brand text-white' : 'text-ink-muted bg-white')}
              >
                <LayoutGrid className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => onViewChange('list')}
                aria-pressed={view === 'list'}
                aria-label="リスト表示"
                className={cn('grid size-9 place-items-center', view === 'list' ? 'bg-brand text-white' : 'text-ink-muted bg-white')}
              >
                <List className="size-4" aria-hidden />
              </button>
            </div>
          </div>

          {chips.length > 0 && (
            <Link
              href={pathname}
              className="border-border text-ink-muted hover:bg-surface-muted rounded-[30px] border px-4 py-2 text-[12px] transition-colors"
            >
              すべてクリア
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
