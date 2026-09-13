import type { Metadata } from 'next';
import Link from 'next/link';
import { FileOutput } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { buttonVariants } from '@/components/ui/button';
import { LedgerLayoutPicker } from '@/components/photos/ledger-layout-picker';
import { demoPhotos } from '@/lib/demo-data';

export const metadata: Metadata = { title: '写真台帳' };

export default function LedgerPage() {
  return (
    <>
      <PageHeader
        title="国道357号 舗装・電線工事 写真台帳"
        actions={
          <Link href="/projects/export" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
            <FileOutput className="size-4" aria-hidden />
            EXCEL / PDF 出力手続きへ
          </Link>
        }
      />
      <LedgerLayoutPicker photos={demoPhotos.slice(0, 6)} />
    </>
  );
}
