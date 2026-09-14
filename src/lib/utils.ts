import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 128 GB / 500 GB style formatting for the storage meter. */
export function formatBytes(bytes: number, digits = 0): string {
  if (bytes <= 0) return '0 GB';
  const gb = bytes / 1024 ** 3;
  if (gb >= 1024) return `${(gb / 1024).toFixed(1)} TB`;
  if (gb >= 1) return `${gb.toFixed(digits)} GB`;
  return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
}

/** 2026/04/28 10:15 — the format used on every photo card in the design. */
export function formatShotAt(date: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
    .format(date)
    .replace(/-/g, '/');
}

export function formatDateOnly(date: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}

/**
 * 集計関数（max/min など）の戻り値を Date に揃える。
 *
 * ドライバは通常の timestamp 列を Date にしてくれますが、集計関数の
 * 戻り値は文字列のまま返ることがあります。型注釈だけ Date にしておくと、
 * 画面側の日付整形が実行時に落ちます。
 */
export function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
