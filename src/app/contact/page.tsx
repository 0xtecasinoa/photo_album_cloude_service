import type { Metadata } from 'next';
import { SiteHeader } from '@/components/marketing/site-header';
import { RecordAccess } from '@/components/app/record-access';
import { SiteFooter } from '@/components/marketing/site-footer';
import { ContactForm } from './contact-form';
import { getSessionContext } from '@/lib/auth/session';
import { getPlatformAdmin } from '@/lib/auth/admin';
import { isPlanKey, PLANS } from '@/lib/plans';

export const metadata: Metadata = {
  title: 'お問い合わせ',
  description: '導入のご相談・お見積り・デモのご予約はこちらから承ります。',
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;

  // 料金表から来た場合は、どのプランを見ていたかを引き継ぐ。
  // 問い合わせ側に「どのプランですか」と聞き返さなくて済む。
  const planKey = plan && isPlanKey(plan) ? plan : null;

  // ログイン中なら会社名や連絡先は分かっているので埋めておく。
  const ctx = await getSessionContext();
  // ログイン中はヘッダーの「ログイン」を出さない。入っているのに出ていると、
  // もう一度ログインが必要だと受け取られる。
  const headerUser = ctx
    ? { name: ctx.user.name, isPlatformAdmin: (await getPlatformAdmin()) !== null }
    : null;

  return (
    <>
      <RecordAccess />
      <SiteHeader user={headerUser} />

      <main>
        <section className="bg-brand pt-[150px] pb-20">
          <div className="mx-auto max-w-[1240px] px-6 lg:px-10">
            <h1 className="text-[30px] font-bold text-white sm:text-[38px]">お問い合わせ</h1>
            <p className="mt-5 text-[14px] leading-[2] text-white/90">
              導入のご相談・お見積り・デモのご予約を承っております。
              <br />
              営業時間：平日 9:00 - 18:00（土日祝日を除く）
            </p>
          </div>
        </section>

        <section className="bg-surface-muted py-20">
          <div className="mx-auto max-w-[720px] px-6">
            {planKey && (
              <p className="border-brand-ring/45 bg-brand-tint text-brand mb-7 rounded-[10px] border px-5 py-4 text-[13px]">
                <span className="font-bold">{PLANS[planKey].name}</span> についてのお問い合わせとして承ります。
              </p>
            )}
            <ContactForm
              planInterest={planKey}
              defaultTopic={planKey ? 'お見積りのご依頼' : ''}
              defaults={{
                company: ctx?.organization.name ?? '',
                name: ctx?.user.name ?? '',
                email: ctx?.user.email ?? '',
              }}
            />
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
