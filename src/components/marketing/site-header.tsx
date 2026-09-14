'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BrandLogo } from '@/components/brand-logo';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '#issues', label: '課題' },
  { href: '#how', label: '仕組み' },
  { href: '#features', label: '特長' },
  { href: '#editor', label: '看板エディタ' },
  { href: '#delivery', label: '電子納品' },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="mx-auto flex max-w-[1440px] items-center gap-6 px-6 py-6 lg:px-10">
        <Link href="/" className="shrink-0">
          <BrandLogo priority />
        </Link>

        <nav className="ml-auto hidden items-center gap-1 rounded-[30px] bg-white/25 px-3 py-2 backdrop-blur-md lg:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-[30px] px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-white/20"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-3 lg:ml-0 lg:flex">
          <Link
            href="/login"
            className="rounded-[30px] border border-white/70 px-6 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-white/15"
          >
            ログイン
          </Link>
          <Link
            href="/signup"
            className="bg-accent hover:bg-accent-hover rounded-[30px] px-6 py-2.5 text-[14px] font-bold text-white transition-colors"
          >
            無料で試してみる
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'メニューを閉じる' : 'メニューを開く'}
          className="ml-auto grid size-11 place-items-center rounded-[10px] bg-white/25 text-white backdrop-blur-md lg:hidden"
        >
          {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        </button>
      </div>

      <div
        className={cn(
          'mx-6 overflow-hidden rounded-[14px] bg-white shadow-xl lg:hidden',
          open ? 'block' : 'hidden',
        )}
      >
        <nav className="flex flex-col p-2">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="hover:bg-brand-tint rounded-[8px] px-4 py-3 text-[15px] text-ink"
            >
              {l.label}
            </a>
          ))}
          <div className="border-border-subtle mt-2 flex gap-3 border-t p-2 pt-4">
            <Link
              href="/login"
              className="border-brand text-brand flex-1 rounded-[30px] border px-5 py-2.5 text-center text-[14px] font-medium"
            >
              ログイン
            </Link>
            <Link
              href="/signup"
              className="bg-accent flex-1 rounded-[30px] px-5 py-2.5 text-center text-[14px] font-bold text-white"
            >
              無料で試してみる
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
