'use client';

import Image from 'next/image';
import { Camera, Upload, Smartphone, CircleCheck, ShieldAlert, ImageOff } from 'lucide-react';
import { cn, formatShotAt } from '@/lib/utils';
import type { PhotoListItem } from '@/lib/queries/photos';

const SOURCE_LABELS: Record<string, { label: string; icon: typeof Camera }> = {
  mobile_camera: { label: '自アプリ', icon: Smartphone },
  web_upload: { label: '取り込み', icon: Upload },
  import: { label: '取り込み', icon: Upload },
  api: { label: '他アプリ連携', icon: Camera },
};

const INTEGRITY: Record<string, { label: string; tone: string }> = {
  valid: { label: '署名OK', tone: 'text-success' },
  invalid: { label: '署名エラー', tone: 'text-danger' },
  unsigned: { label: '署名なし', tone: 'text-ink-faint' },
  pending: { label: '検証待ち', tone: 'text-ink-faint' },
  error: { label: '検証失敗', tone: 'text-danger' },
};

export function PhotoCard({
  photo,
  selected,
  onToggle,
}: {
  photo: PhotoListItem;
  selected: boolean;
  onToggle: (id: string) => void;
}) {
  const source = SOURCE_LABELS[photo.uploadSource] ?? SOURCE_LABELS.web_upload!;
  const SourceIcon = source.icon;
  const integrity = INTEGRITY[photo.integrityStatus] ?? INTEGRITY.unsigned!;
  const blocksDelivery = photo.integrityStatus !== 'valid';

  return (
    <article
      className={cn(
        'w-full overflow-hidden rounded-[10px] border bg-white transition-shadow',
        selected ? 'border-brand shadow-[0_0_0_2px_rgba(30,58,139,0.18)]' : 'border-border-subtle',
      )}
    >
      <div className="relative">
        {photo.thumbnailUrl ? (
          <Image
            src={photo.thumbnailUrl}
            alt={[photo.category, photo.workDetail, photo.title].filter(Boolean).join(' ') || '工事写真'}
            width={480}
            height={360}
            unoptimized
            className="h-[144px] w-full bg-surface-sunken object-cover"
          />
        ) : (
          <div className="bg-surface-sunken grid h-[144px] w-full place-items-center" aria-hidden>
            <ImageOff className="text-ink-faint size-8" strokeWidth={1.4} />
          </div>
        )}

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
                <path d="M2 7.5 5.5 11 12 3.5" fill="none" stroke="currentColor"
                  strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <span className="sr-only">この写真を選択</span>
        </label>

        {blocksDelivery && (
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
            {source.label}
          </span>
          <span className={cn('inline-flex items-center gap-1.5 font-medium', integrity.tone)}>
            {photo.integrityStatus === 'valid'
              ? <CircleCheck className="size-3.5" aria-hidden />
              : <ShieldAlert className="size-3.5" aria-hidden />}
            {integrity.label}
          </span>
        </div>

        <p className="tabular mt-3 text-xs text-ink">{formatShotAt(photo.takenAt)}</p>
        <p className="mt-1 truncate text-xs text-ink">
          {[photo.category, photo.workDetail].filter(Boolean).join('　') || '（区分未設定）'}
        </p>

        {(photo.title || photo.shootingLocation || photo.contractorNote) && (
          <div className="bg-success-tint mt-3 rounded-[6px] px-2.5 py-2">
            <p className="text-success text-xs font-bold">写真情報</p>
            <dl className="mt-1 space-y-0.5 text-[11px] text-ink">
              {photo.title && (
                <div className="flex gap-1">
                  <dt className="shrink-0">内容：</dt><dd className="truncate">{photo.title}</dd>
                </div>
              )}
              {photo.shootingLocation && (
                <div className="flex gap-1">
                  <dt className="shrink-0">箇所：</dt><dd className="truncate">{photo.shootingLocation}</dd>
                </div>
              )}
              {photo.contractorNote && (
                <div className="flex gap-1">
                  <dt className="shrink-0">備考：</dt><dd className="truncate">{photo.contractorNote}</dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>
    </article>
  );
}
