'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDateOnly } from '@/lib/utils';

export type Facets = {
  total: number;
  earliest: Date | null;
  latest: Date | null;
  byWorkType: { value: string | null; count: number }[];
  byIntegrity: { value: string; count: number }[];
  bySource: { value: string; count: number }[];
};

const INTEGRITY_LABELS: Record<string, string> = {
  valid: '署名OK', invalid: '署名エラー', unsigned: '署名なし',
  pending: '検証待ち', error: '検証失敗',
};
const SOURCE_LABELS: Record<string, string> = {
  mobile_camera: '自アプリで撮影', web_upload: '取り込み（アップロード）',
  import: '取り込み', api: '他アプリから連携',
};

function Group({
  label,
  param,
  options,
  labels,
}: {
  label: string;
  param: string;
  options: { value: string | null; count: number }[];
  labels?: Record<string, string>;
}) {
  const [open, setOpen] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const active = search.get(param);

  /** 絞り込みは URL に持たせる。再読み込みや共有で同じ結果に戻れるため。 */
  const apply = (value: string | null) => {
    const next = new URLSearchParams(search.toString());
    if (value === null || value === active) next.delete(param);
    else next.set(param, value);
    router.push(`${pathname}?${next.toString()}`);
  };

  if (options.length === 0) return null;

  return (
    <section className="mb-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="text-brand flex w-full items-center gap-2 text-[13px] font-bold"
      >
        <ChevronDown className={cn('size-3.5 transition-transform', !open && '-rotate-90')} aria-hidden />
        {label}
      </button>

      {open && (
        <ul className="border-border-subtle mt-2 ml-[7px] space-y-[7px] border-l pl-3">
          {options.map((o) => {
            if (!o.value) return null;
            const isActive = active === o.value;
            return (
              <li key={o.value}>
                <button
                  type="button"
                  onClick={() => apply(o.value)}
                  aria-pressed={isActive}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 text-[12px]',
                    isActive ? 'text-brand font-bold' : 'hover:text-brand text-ink',
                  )}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <ChevronRight className={cn('size-3 shrink-0', !isActive && 'opacity-40')} aria-hidden />
                    {labels?.[o.value] ?? o.value}
                  </span>
                  <span className="tabular text-ink-muted text-[11px]">
                    {o.count.toLocaleString('ja-JP')}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function FilterRail({ facets }: { facets: Facets }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const hasFilters = ['workType', 'integrity', 'source', 'category'].some((k) => search.get(k));

  return (
    <div className="w-[199px] shrink-0">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-brand text-[13px] font-bold">絞り込み</h2>
        {hasFilters && (
          <button
            type="button"
            onClick={() => router.push(pathname)}
            className="text-brand-link text-[12px] hover:underline"
          >
            リセット
          </button>
        )}
      </div>

      <Group label="工種" param="workType" options={facets.byWorkType} />
      <Group label="署名の状態" param="integrity" options={facets.byIntegrity} labels={INTEGRITY_LABELS} />
      <Group label="出所（写真の出どころ）" param="source" options={facets.bySource} labels={SOURCE_LABELS} />

      {facets.earliest && facets.latest && (
        <section>
          <h3 className="text-brand mb-2 text-[13px] font-bold">撮影日</h3>
          <p className="tabular text-ink-muted text-[11px]">
            {formatDateOnly(facets.earliest)} 〜 {formatDateOnly(facets.latest)}
          </p>
        </section>
      )}
    </div>
  );
}
