import type { Metadata } from 'next';
import { PageHeader } from '@/components/app/page-header';
import { ExportPanel } from '@/components/photos/export-panel';
import { loadLedgerData } from '@/lib/export/ledger-source';
import { findNonCompliant } from '@/lib/export/denshi-nouhin';
import { demoProject } from '@/lib/demo-data';

export const metadata: Metadata = { title: '電子納品出力設定' };

export default async function DenshiNouhinPage() {
  const data = await loadLedgerData(demoProject.id);
  // 出力を止めるかどうかは、画面の見た目ではなく実際の判定処理で決める。
  const nonCompliant = findNonCompliant(data.photos);

  return (
    <>
      <PageHeader title="電子納品出力設定" />
      <ExportPanel
        projectId={demoProject.id}
        totalPhotos={data.photos.length}
        nonCompliant={nonCompliant}
      />
    </>
  );
}
