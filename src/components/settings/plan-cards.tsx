'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { Loader2, Check } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  LISTED_PLANS,
  cardPlanFor,
  trialDaysLeft,
  type PlanKey,
} from '@/lib/plans';
import {
  startTrialAction,
  changePlanAction,
  type PlanFormState,
} from '@/app/(app)/settings/actions';

function ActionButton({
  label,
  variant,
  accent,
}: {
  label: string;
  variant: 'outline' | 'accent';
  accent: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      size="lg"
      disabled={pending}
      className={cn('mt-9 w-full', accent && 'text-white')}
    >
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {pending ? '処理中…' : label}
    </Button>
  );
}

export function PlanCards({
  currentPlan,
  trialEndsAt,
  trialUsed,
  canManageBilling,
}: {
  currentPlan: string;
  trialEndsAt: Date | null;
  trialUsed: boolean;
  canManageBilling: boolean;
}) {
  const [trialState, trialAction] = useActionState<PlanFormState, FormData>(startTrialAction, {});
  const [changeState, changeAction] = useActionState<PlanFormState, FormData>(changePlanAction, {});

  // 2つの状態を持つため、新しいほうだけを出す。
  const latest = (changeState.at ?? 0) > (trialState.at ?? 0) ? changeState : trialState;

  const active: PlanKey = cardPlanFor(currentPlan);
  const onTrial = currentPlan === 'trial';
  const daysLeft = trialDaysLeft(trialEndsAt);

  return (
    <>
      {latest.error && (
        <p role="alert" className="border-danger/40 bg-danger-tint text-danger mx-auto mt-10 max-w-[720px] rounded-[8px] border px-5 py-4 text-center text-[13px]">
          {latest.error}
        </p>
      )}
      {latest.message && (
        <p role="status" className="border-success/40 bg-success-tint text-success mx-auto mt-10 max-w-[720px] rounded-[8px] border px-5 py-4 text-center text-[13px]">
          {latest.message}
        </p>
      )}

      <div className="mt-14 grid items-start gap-6 lg:grid-cols-3">
        {LISTED_PLANS.map((plan) => {
          const isCurrent = plan.key === active;

          return (
            <div
              key={plan.key}
              className={cn(
                'relative rounded-[16px] border-2 px-7 pb-9 text-center',
                plan.featured
                  ? 'border-accent bg-white pt-12 shadow-[0_4px_24px_rgba(240,174,30,0.18)] lg:-mt-6'
                  : 'border-brand-ring/45 bg-brand-ring/8 pt-9',
                isCurrent && !plan.featured && 'border-brand bg-brand-tint/60',
              )}
            >
              {plan.ribbon && !isCurrent && (
                <span className="bg-accent absolute -top-[22px] left-1/2 -translate-x-1/2 rounded-[30px] px-6 py-2.5 text-[13px] font-bold whitespace-nowrap text-white">
                  {plan.ribbon}
                </span>
              )}
              {isCurrent && (
                <span className="bg-brand absolute -top-[22px] left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-[30px] px-6 py-2.5 text-[13px] font-bold whitespace-nowrap text-white">
                  <Check className="size-4" aria-hidden />
                  ご利用中のプラン
                  {onTrial && daysLeft !== null && `（トライアル残り${daysLeft}日）`}
                </span>
              )}

              <h3 className={cn('text-[22px] font-bold', plan.featured ? 'text-ink' : 'text-brand-link')}>
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

              {/* ---- プランごとの行き先 ---- */}
              {plan.key === 'free' &&
                (isCurrent ? (
                  <Link href="/help" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'mt-9 w-full')}>
                    ヘルプページを見る
                  </Link>
                ) : canManageBilling ? (
                  <form
                    action={changeAction}
                    onSubmit={(e) => {
                      if (!confirm('フリープランに変更します。保存容量と人数の上限が下がります。よろしいですか？')) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <input type="hidden" name="plan" value="free" />
                    <ActionButton label="フリープランに変更" variant="outline" accent={false} />
                  </form>
                ) : (
                  <Link href="/help" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'mt-9 w-full')}>
                    ヘルプページを見る
                  </Link>
                ))}

              {plan.key === 'genba_pro' &&
                (isCurrent ? (
                  onTrial ? (
                    <Link
                      href="/contact?plan=genba_pro"
                      className={cn(buttonVariants({ variant: 'accent', size: 'lg' }), 'mt-9 w-full text-white')}
                    >
                      本契約に切り替える
                    </Link>
                  ) : (
                    <Link href="/help" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'mt-9 w-full')}>
                      ヘルプページを見る
                    </Link>
                  )
                ) : trialUsed || !canManageBilling ? (
                  <Link
                    href="/contact?plan=genba_pro"
                    className={cn(buttonVariants({ variant: 'accent', size: 'lg' }), 'mt-9 w-full text-white')}
                  >
                    お申し込み・お問い合わせ
                  </Link>
                ) : (
                  <form action={trialAction}>
                    <ActionButton label="14日間無料トライアルを開始" variant="accent" accent />
                  </form>
                ))}

              {plan.key === 'enterprise' && (
                <Link
                  href="/contact?plan=enterprise"
                  className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'mt-9 w-full')}
                >
                  法人問い合わせフォーム
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {!canManageBilling && (
        <p className="text-ink-muted mt-8 text-center text-[12px]">
          プランの変更には「請求情報を管理」権限が必要です。オーナーにご依頼ください。
        </p>
      )}
    </>
  );
}
