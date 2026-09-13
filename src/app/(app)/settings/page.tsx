import type { Metadata } from 'next';
import { UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: '設定・プラン' };

type Plan = {
  name: string;
  audience: string;
  price: string;
  priceNote: string;
  features: string[];
  cta: string;
  ctaVariant: 'outline' | 'accent';
  featured?: boolean;
  ribbon?: string;
};

const PLANS: Plan[] = [
  {
    name: 'フリープラン',
    audience: '個人事業主・1現場お試し作成向け',
    price: '¥0',
    priceNote: '永久無料',
    features: [
      '案件作成数: 1案件',
      '写真保存数: 最大100枚',
      '電子小黒板編集・PDF台帳出力',
      'スマホ横持ちアプリ撮影',
    ],
    cta: 'ヘルプページを見る',
    ctaVariant: 'outline',
  },
  {
    name: '現場プロ クラウド',
    audience: '小〜中規模建設会社・複数現場同時進行',
    price: '¥9,800',
    priceNote: '月（税別）',
    features: [
      '案件作成数：無制限',
      'クラウドストレージ：100GB（約5万枚）',
      'AI図面OCR & 工程自動振り分け',
      '6桁招待コードで協力会社と無制限参加',
      '電子納品（CALS/EC ZIP）完全出力',
    ],
    cta: '14日間無料トライアルを開始',
    ctaVariant: 'accent',
    featured: true,
    ribbon: '一番人気★現場オススメ',
  },
  {
    name: 'ゼネコン・企業パック',
    audience: '大手ゼネコン・専用サーバー・SSO連携',
    price: 'お問い合わせ',
    priceNote: '年間契約',
    features: [
      '容量無制限 & 専任サポート',
      'SAML / Azure AD SSO 連携',
      '基幹システム連携（各種ソフト）API連携',
      'セキュリティ監査ログ & 閲覧ログ 外部保管',
    ],
    cta: '法人問い合わせフォーム',
    ctaVariant: 'outline',
  },
];

export default function SettingsPlanPage() {
  return (
    <>
      <PageHeader
        title="設定・プラン"
        actions={
          <Button variant="primary" size="lg">
            <UserPlus className="size-4" aria-hidden />
            メンバーを招待
          </Button>
        }
      />

      <div className="px-8 pt-12 xl:px-[31px]">
        <div className="mx-auto max-w-[1090px] text-center">
          <h2 className="text-brand inline text-[26px] leading-[1.5] font-bold sm:text-[30px]">
            {/* The gold rule sits behind the text baseline in the design. */}
            <span className="bg-accent/85 box-decoration-clone px-3 py-1 text-white">
              現場の規模に合わせて選べるシンプルなプラン
            </span>
          </h2>
          <p className="text-brand mt-7 text-[16px] leading-[1.9]">
            初期費用0円。全プランで国土交通省電子納品規格（CALS/EC）・JACIC信憑性
            <br className="hidden sm:block" />
            確認・電子小黒板自動連携に対応。
          </p>
        </div>

        <div className="mt-14 grid items-start gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                'relative rounded-[16px] border-2 px-7 pb-9 text-center',
                plan.featured
                  ? 'border-accent bg-white pt-12 shadow-[0_4px_24px_rgba(240,174,30,0.18)] lg:-mt-6'
                  : 'border-brand-ring/45 bg-brand-ring/8 pt-9',
              )}
            >
              {plan.ribbon && (
                <span className="bg-accent absolute -top-[22px] left-1/2 -translate-x-1/2 rounded-[30px] px-6 py-2.5 text-[13px] font-bold whitespace-nowrap text-white">
                  {plan.ribbon}
                </span>
              )}

              <h3
                className={cn(
                  'text-[22px] font-bold',
                  plan.featured ? 'text-ink' : 'text-brand-link',
                )}
              >
                {plan.name}
              </h3>
              <div className="border-border-subtle mt-4 border-t pt-4">
                <p className="text-ink-muted text-[12px]">{plan.audience}</p>
              </div>

              <p className="mt-6 flex items-baseline justify-center gap-2">
                <span className="text-[34px] leading-none font-bold text-ink">{plan.price}</span>
                <span className="text-ink-muted text-[12px]">/ {plan.priceNote}</span>
              </p>

              <ul className="mt-7 space-y-3 text-[12px] text-ink">
                {plan.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>

              <Button
                variant={plan.ctaVariant}
                size="lg"
                className={cn('mt-9 w-full', plan.ctaVariant === 'accent' && 'text-white')}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
