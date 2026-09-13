import type { Metadata } from 'next';
import { PlusCircle, Upload } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Button } from '@/components/ui/button';
import { PhotoBrowser } from '@/components/photos/photo-browser';
import { demoProject, demoPhotos } from '@/lib/demo-data';

export const metadata: Metadata = { title: '工事写真台帳' };

export default function ProjectPhotosPage() {
  return (
    <>
      <PageHeader
        title={demoProject.name}
        actions={
          <>
            <Button variant="outline" size="lg">
              <PlusCircle className="size-[14px]" aria-hidden />
              写真を追加
            </Button>
            <Button variant="primary" size="lg">
              <Upload className="size-[13px]" aria-hidden />
              一括取り込み
            </Button>
          </>
        }
      />
      <PhotoBrowser photos={demoPhotos} />
    </>
  );
}
