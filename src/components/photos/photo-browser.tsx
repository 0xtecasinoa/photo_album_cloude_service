'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2, ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FilterRail, type Facets } from './filter-rail';
import { PhotoToolbar } from './photo-toolbar';
import { TagDialog } from './tag-dialog';
import { PhotoCard } from './photo-card';
import { deletePhotosAction } from '@/app/(app)/projects/[projectId]/actions';
import type { PhotoListItem } from '@/lib/queries/photos';

export function PhotoBrowser({
  projectId,
  photos,
  facets,
  canDelete,
}: {
  projectId: string;
  photos: PhotoListItem[];
  facets: Facets;
  canDelete: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelected = photos.length > 0 && selected.size === photos.length;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(photos.map((p) => p.id)));

  function remove() {
    if (selected.size === 0) return;
    // 論理削除だが、現場では取り返しがつかない操作に見えるため確認する。
    if (!confirm(`${selected.size}枚を削除します。よろしいですか？\n（削除した写真は管理者が復元できます）`)) return;

    const ids = [...selected];
    startTransition(async () => {
      await deletePhotosAction(projectId, ids);
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <>
      <PhotoToolbar total={facets.total} view={view} onViewChange={setView} />

      <div className="flex gap-6 px-8 pt-6 xl:px-[31px]">
        <div className="hidden lg:block">
          <FilterRail facets={facets} />
        </div>

        <div className="border-border-subtle min-w-0 flex-1 lg:border-l lg:pl-12">
          {photos.length === 0 ? (
            <div className="border-border-subtle grid place-items-center rounded-[14px] border border-dashed bg-white px-6 py-20 text-center">
              <ImageOff className="text-brand/30 size-10" strokeWidth={1.3} aria-hidden />
              <h2 className="mt-4 text-[15px] font-bold text-ink">
                {facets.total === 0 ? '写真がまだありません' : '条件に一致する写真がありません'}
              </h2>
              <p className="text-ink-muted mt-2 text-[13px]">
                {facets.total === 0
                  ? '「写真を追加」から現場写真を取り込んでください。'
                  : '絞り込み条件を変えてお試しください。'}
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="peer sr-only" />
                  <span className={cn(
                    'grid size-[22px] place-items-center rounded-[4px] border-2 transition-colors',
                    'peer-focus-visible:outline-brand-ring peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2',
                    allSelected ? 'bg-brand border-brand' : 'border-border bg-white')}>
                    {allSelected && (
                      <svg viewBox="0 0 14 14" className="size-3.5 text-white" aria-hidden>
                        <path d="M2 7.5 5.5 11 12 3.5" fill="none" stroke="currentColor"
                          strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span className="text-[12px] text-ink-muted">
                    {selected.size > 0 ? `${selected.size}枚を選択中` : 'すべて選択'}
                  </span>
                </label>

                <div className="flex flex-wrap items-center gap-2">
                {selected.size > 0 && (
                  <TagDialog
                    projectId={projectId}
                    photoIds={[...selected]}
                    onDone={() => {
                      setSelected(new Set());
                      router.refresh();
                    }}
                  />
                )}
                {canDelete && selected.size > 0 && (
                  <button
                    type="button"
                    onClick={remove}
                    disabled={pending}
                    className="text-danger hover:bg-danger-tint flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-[12px] font-bold transition-colors disabled:opacity-50"
                  >
                    {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Trash2 className="size-3.5" aria-hidden />}
                    選択した写真を削除
                  </button>
                )}
                </div>
              </div>

              <div className={cn('grid gap-x-[43px] gap-y-[25px]',
                view === 'grid'
                  ? 'grid-cols-[repeat(auto-fill,minmax(231px,1fr))]'
                  : 'grid-cols-1 md:grid-cols-2')}>
                {photos.map((photo) => (
                  <PhotoCard key={photo.id} photo={photo} selected={selected.has(photo.id)} onToggle={toggle} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
