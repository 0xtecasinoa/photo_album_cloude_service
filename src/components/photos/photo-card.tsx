'use client';

import { Camera, Upload, CircleCheck, CircleAlert, ShieldAlert } from 'lucide-react';
import { cn, formatShotAt } from '@/lib/utils';
import type { DemoPhoto } from '@/lib/demo-data';

export function PhotoCard({
  photo,
  selected,
  onToggle,
}: {
  photo: DemoPhoto;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  const SourceIcon = photo.source === '自アプリ' ? Camera : Upload;

  return (
    <article
      className={cn(
        'w-full overflow-hidden rounded-[10px] border bg-white transition-shadow',
        selected ? 'border-brand shadow-[0_0_0_2px_rgba(30,58,139,0.18)]' : 'border-border-subtle',
      )}
    >
      <div className="relative">
        <div
          className="h-[144px] w-full"
          style={{ backgroundColor: photo.thumbnailTone }}
          role="img"
          aria-label={`${photo.category} ${photo.workDetail} の写真`}
        />

        <label className="absolute top-3 left-3 cursor-pointer">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggle(photo.id)}
            className="peer sr-only"
          />
          <span
            className={cn(
              'grid size-[22px] place-items-center rounded-[4px] border-2 transition-colors',
              'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-white',
              selected ? 'bg-brand border-brand' : 'border-white/90 bg-white/35',
            )}
          >
            {selected && (
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
          <span className="sr-only">この写真を選択</span>
        </label>

        {photo.integrityValid === false && (
          <span
            className="bg-danger absolute top-3 right-3 grid size-[22px] place-items-center rounded-full text-white"
            title="デジタル署名が検証できません。電子納品には使用できません。"
          >
            <ShieldAlert className="size-3.5" aria-hidden />
            <span className="sr-only">署名未検証</span>
          </span>
        )}
      </div>

      <div className="px-[15px] py-4">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-brand-link inline-flex items-center gap-1.5 font-medium">
            <SourceIcon className="size-3.5" aria-hidden />
            {photo.source}
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 font-medium',
              photo.analysed ? 'text-success' : 'text-ink-faint',
            )}
          >
            {photo.analysed ? (
              <CircleCheck className="size-3.5" aria-hidden />
            ) : (
              <CircleAlert className="size-3.5" aria-hidden />
            )}
            {photo.analysed ? 'AI解析済み' : '未解析'}
          </span>
        </div>

        <p className="tabular mt-3 text-xs text-ink">{formatShotAt(photo.takenAt)}</p>
        <p className="mt-1 text-xs text-ink">
          {photo.category}　{photo.workDetail}
        </p>

        <div className="bg-success-tint mt-3 rounded-[6px] px-2.5 py-2">
          <p className="text-success text-xs font-bold">AI抽出データ</p>
          <dl className="mt-1 space-y-0.5 text-[11px] text-ink">
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
      </div>
    </article>
  );
}
