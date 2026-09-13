'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { demoFilterTree } from '@/lib/demo-data';

function FilterGroup({ label, items }: { label: string; items: (typeof demoFilterTree)[number]['items'] }) {
  const [open, setOpen] = useState(true);
  const [expanded, setExpanded] = useState<string | null>('鉄筋工');

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
          {items.map((item) => {
            const hasChildren = item.children.length > 0;
            const isExpanded = expanded === item.label;
            return (
              <li key={item.label}>
                <button
                  type="button"
                  onClick={() => hasChildren && setExpanded(isExpanded ? null : item.label)}
                  aria-expanded={hasChildren ? isExpanded : undefined}
                  className="hover:text-brand flex w-full items-center justify-between gap-2 text-[12px] text-ink"
                >
                  <span className="flex items-center gap-1.5">
                    {hasChildren ? (
                      isExpanded ? (
                        <ChevronDown className="size-3 shrink-0" aria-hidden />
                      ) : (
                        <ChevronRight className="size-3 shrink-0" aria-hidden />
                      )
                    ) : (
                      <ChevronRight className="size-3 shrink-0 opacity-40" aria-hidden />
                    )}
                    {item.label}
                  </span>
                  <span className="tabular text-ink-muted text-[11px]">
                    {item.count.toLocaleString('ja-JP')}
                  </span>
                </button>

                {hasChildren && isExpanded && (
                  <ul className="border-border-subtle mt-1.5 ml-[6px] space-y-1.5 border-l pl-3">
                    {item.children.map((child) => (
                      <li key={child.label} className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-ink-muted">{child.label}</span>
                        <span className="tabular text-ink-faint text-[11px]">
                          {child.count.toLocaleString('ja-JP')}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function FilterRail() {
  return (
    <div className="w-[199px] shrink-0">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-brand text-[13px] font-bold">絞り込み</h2>
        <button type="button" className="text-brand-link text-[12px] hover:underline">
          リセット
        </button>
      </div>

      {demoFilterTree.map((group) => (
        <FilterGroup key={group.label} label={group.label} items={group.items} />
      ))}

      <section className="mb-6">
        <h3 className="text-brand mb-2 flex items-center gap-2 text-[13px] font-bold">
          <ChevronDown className="size-3.5" aria-hidden />
          撮影日
        </h3>
        <div className="border-border flex h-[34px] items-center gap-2 rounded-[6px] border px-2.5">
          <Calendar className="text-ink-muted size-3.5 shrink-0" aria-hidden />
          <span className="tabular text-[11px] text-ink">2024/04/01 〜 2024/04/30</span>
        </div>
      </section>

      <section className="mb-4 flex items-center justify-between">
        <h3 className="text-brand flex items-center gap-2 text-[13px] font-bold">
          <ChevronRight className="size-3.5" aria-hidden />
          タグ
        </h3>
        <button
          type="button"
          className="text-brand-link hover:bg-brand-tint grid size-5 place-items-center rounded-full"
          aria-label="タグを追加"
        >
          <Plus className="size-4" aria-hidden />
        </button>
      </section>

      <button type="button" className="text-brand flex items-center gap-2 text-[13px] font-bold">
        <ChevronRight className="size-3.5" aria-hidden />
        詳細フィルター
      </button>
    </div>
  );
}
