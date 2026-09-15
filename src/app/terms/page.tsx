import type { Metadata } from 'next';
import { SiteHeader } from '@/components/marketing/site-header';
import { getSessionContext } from '@/lib/auth/session';
import { SiteFooter } from '@/components/marketing/site-footer';

export const metadata: Metadata = { title: '利用規約' };

export default async function Page() {
  // ログイン中はヘッダーの「ログイン」を出さない。入っているのに出ていると、
  // もう一度ログインが必要だと受け取られる。
  const ctx = await getSessionContext();
  const headerUser = ctx ? { name: ctx.user.name } : null;

  return (
    <>
      <SiteHeader user={headerUser} />
      <main>
        <section className="bg-brand pt-[150px] pb-20">
          <div className="mx-auto max-w-[1240px] px-6 lg:px-10">
            <h1 className="text-[30px] font-bold text-white sm:text-[38px]">利用規約</h1>
          </div>
        </section>
        <section className="py-20">
          <div className="mx-auto max-w-[820px] px-6">
            <p className="text-ink-muted text-[14px] leading-[2]">
              本ページは準備中です。公開前に正式な利用規約 を掲載してください。
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
