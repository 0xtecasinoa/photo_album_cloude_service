import type { Metadata } from 'next';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';

export const metadata: Metadata = { title: 'プライバシーポリシー' };

export default function Page() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="bg-brand pt-[150px] pb-20">
          <div className="mx-auto max-w-[1240px] px-6 lg:px-10">
            <h1 className="text-[30px] font-bold text-white sm:text-[38px]">プライバシーポリシー</h1>
          </div>
        </section>
        <section className="py-20">
          <div className="mx-auto max-w-[820px] px-6">
            <p className="text-ink-muted text-[14px] leading-[2]">
              本ページは準備中です。公開前に正式なプライバシーポリシー を掲載してください。
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
