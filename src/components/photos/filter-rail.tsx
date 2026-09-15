'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { cn, formatDateOnly } from '@/lib/utils';
import type { WorkTypeNode } from '@/lib/queries/photos';

const INTEGRITY_LABELS: Record<string, string> = {
  valid: '署名OK',
  invalid: '署名エラー',
  unsigned: '署名なし',
  pending: '検証待ち',
  error: '検証失敗',
};

const SOURCE_LABELS: Record<string, string> = {
  mobile_camera: '自アプリで撮影',
  web_upload: '取り込み（アップロード）',
  import: '他アプリから採録',
  api: 'API連携',
};

export type Facets = {
  total: number;
  earliest: Date | null;
  latest: Date | null;
  byWorkType: WorkTypeNode[];
  byIntegrity: { value: string; count: number }[];
  bySource: { value: string; count: number }[];
  byOcr: { done: number; undone: number };
  byTag: { value: string; count: number }[];
};

/** 絞り込みの1項目。押すと URL のクエリだけが変わる。 */
function FilterLink({
  param,
  value,
  label,
  count,
  indent = 0,
}: {
  param: string;
  value: string;
  label: string;
  count: number;
  indent?: number;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const active = params.get(param) === value;

  const next = new URLSearchParams(params.toString());
  if (active) next.delete(param);
  else next.set(param, value);

  return (
    <Link
      href={`${pathname}?${next.toString()}`}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'flex items-center justify-between gap-2 rounded-[6px] py-1.5 pr-2 text-[12px] transition-colors',
        active ? 'bg-brand-tint text-brand font-bold' : 'text-ink-muted hover:bg-surface-muted',
      )}
      style={{ paddingLeft: `${8 + indent * 14}px` }}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        {indent > 0 && <ChevronRight className="size-3 shrink-0 opacity-50" aria-hidden />}
        <span className="truncate">{label}</span>
      </span>
      <span className="tabular shrink-0 text-[11px] opacity-70">{count.toLocaleString('ja-JP')}</span>
    </Link>
  );
}

function Group({
  label,
  children,
  defaultOpen = true,
}: {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="mb-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="text-brand mb-1.5 flex w-full items-center gap-1.5 text-[13px] font-bold"
      >
        <ChevronDown className={cn('size-4 transition-transform', !open && '-rotate-90')} aria-hidden />
        {label}
      </button>
      {open && <div className="space-y-0.5">{children}</div>}
    </section>
  );
}

export function FilterRail({ facets }: { facets: Facets }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const hasAny = [...params.keys()].some((k) => k !== 'view' && k !== 'sort');

  return (
    <aside className="w-[236px] shrink-0">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-brand text-[14px] font-bold">絞り込み</h2>
        {hasAny && (
          <Link href={pathname} className="text-brand-link text-[12px] hover:underline">
            リセット
          </Link>
        )}
      </div>

      <Group label="工程・分類">
        {facets.byWorkType.length === 0 && (
          <p className="text-ink-faint px-2 text-[12px]">まだ登録がありません</p>
        )}
        {facets.byWorkType.map((type) => (
          <div key={type.value}>
            <FilterLink param="workType" value={type.value} label={type.value} count={type.count} />
            {type.children.map((kind) => (
              <div key={kind.value}>
                <FilterLink param="workKind" value={kind.value} label={kind.value} count={kind.count} indent={1} />
                {kind.children.map((detail) => (
                  <FilterLink
                    key={detail.value}
                    param="workDetail"
                    value={detail.value}
                    label={detail.value}
                    count={detail.count}
                    indent={2}
                  />
                ))}
              </div>
            ))}
          </div>
        ))}
      </Group>

      <Group label="AI解析状態">
        <FilterLink param="ocr" value="done" label="AI解析済み" count={facets.byOcr.done} />
        <FilterLink param="ocr" value="undone" label="未解析" count={facets.byOcr.undone} />
      </Group>

      <Group label="署名の状態">
        {facets.byIntegrity.map((r) => (
          <FilterLink
            key={r.value}
            param="integrity"
            value={r.value}
            label={INTEGRITY_LABELS[r.value] ?? r.value}
            count={r.count}
          />
        ))}
      </Group>

      <Group label="出所（写真の出どころ）">
        {facets.bySource.map((r) => (
          <FilterLink
            key={r.value}
            param="source"
            value={r.value}
            label={SOURCE_LABELS[r.value] ?? r.value}
            count={r.count}
          />
        ))}
      </Group>

      <Group label="タグ">
        {facets.byTag.length === 0 ? (
          <p className="text-ink-faint px-2 text-[12px] leading-[1.8]">
            写真を選んでタグを付けると、ここから絞り込めます。
          </p>
        ) : (
          facets.byTag.map((t) => (
            <FilterLink key={t.value} param="tag" value={t.value} label={t.value} count={t.count} />
          ))
        )}
      </Group>

      <section className="mb-5">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          aria-expanded={showAdvanced}
          className="text-brand flex w-full items-center gap-1.5 text-[13px] font-bold"
        >
          <ChevronDown className={cn('size-4 transition-transform', !showAdvanced && '-rotate-90')} aria-hidden />
          詳細フィルター
        </button>
        {showAdvanced && (
          <div className="mt-2 space-y-3">
            <div>
              <p className="text-ink-muted mb-1 text-[12px]">撮影日</p>
              <p className="tabular text-ink-faint text-[11px]">
                {facets.earliest && facets.latest
                  ? `${formatDateOnly(facets.earliest)} 〜 ${formatDateOnly(facets.latest)}`
                  : '—'}
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <input
                  type="date"
                  aria-label="撮影日の開始"
                  defaultValue={params.get('from') ?? ''}
                  onChange={(e) => {
                    const next = new URLSearchParams(params.toString());
                    if (e.target.value) next.set('from', e.target.value);
                    else next.delete('from');
                    window.location.href = `${pathname}?${next.toString()}`;
                  }}
                  className="border-border h-8 w-full rounded-[6px] border px-2 text-[11px]"
                />
                <span className="text-ink-faint text-[11px]">〜</span>
                <input
                  type="date"
                  aria-label="撮影日の終了"
                  defaultValue={params.get('to') ?? ''}
                  onChange={(e) => {
                    const next = new URLSearchParams(params.toString());
                    if (e.target.value) next.set('to', e.target.value);
                    else next.delete('to');
                    window.location.href = `${pathname}?${next.toString()}`;
                  }}
                  className="border-border h-8 w-full rounded-[6px] border px-2 text-[11px]"
                />
              </div>
            </div>

            <div>
              <p className="text-ink-muted mb-1 text-[12px]">写真区分</p>
              <div className="space-y-0.5">
                {['着手前及び完成写真', '施工状況写真', '安全管理写真', '使用材料写真', '品質管理写真', '出来形管理写真', '災害写真', 'その他'].map(
                  (c) => (
                    <FilterLink key={c} param="category" value={c} label={c} count={0} />
                  ),
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </aside>
  );
}

export { INTEGRITY_LABELS, SOURCE_LABELS };
