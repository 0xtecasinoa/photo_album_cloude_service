import type { Metadata } from 'next';
import { Users, HardDrive, FolderOpen, CalendarClock } from 'lucide-react';
import { PageHeader } from '@/components/app/page-header';
import { InviteMemberDialog } from '@/components/members/invite-member-dialog';
import { PlanCards } from '@/components/settings/plan-cards';
import { requireSession } from '@/lib/auth/session';
import { listOrgRoles } from '@/lib/queries/members';
import { getOrganizationPlanState } from '@/lib/queries/organization';
import { planName, trialDaysLeft } from '@/lib/plans';
import { formatBytes, formatDateOnly } from '@/lib/utils';

export const metadata: Metadata = { title: '設定・プラン' };

export default async function SettingsPlanPage() {
  const { organization, capabilities } = await requireSession();

  const [roles, state] = await Promise.all([
    capabilities.has('member.invite') ? listOrgRoles(organization.id) : Promise.resolve([]),
    getOrganizationPlanState(organization.id),
  ]);

  const onTrial = state?.plan === 'trial';
  const daysLeft = trialDaysLeft(state?.trialEndsAt ?? null);

  const storagePct =
    state && state.storageQuotaBytes > 0
      ? Math.min(100, Math.round((state.storageUsedBytes / state.storageQuotaBytes) * 100))
      : 0;

  return (
    <>
      <PageHeader
        title="設定・プラン"
        actions={
          <InviteMemberDialog roles={roles} canInvite={capabilities.has('member.invite')} />
        }
      />

      <div className="px-8 pt-8 pb-16 xl:px-[31px]">
        {/* ---- 現在のご契約 ---- */}
        {state && (
          <section className="border-border-subtle rounded-[14px] border bg-white px-7 py-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <p className="text-ink-muted text-[12px]">{organization.name}　/　現在のご契約</p>
                <h2 className="text-brand mt-1 text-[22px] font-bold">{planName(state.plan)}</h2>
              </div>
              {onTrial && state.trialEndsAt && (
                <p className="border-accent/45 bg-accent/10 text-ink flex items-center gap-2 rounded-[8px] border px-4 py-2 text-[12px]">
                  <CalendarClock className="text-accent size-4" aria-hidden />
                  {formatDateOnly(state.trialEndsAt)} まで（残り {daysLeft} 日）
                </p>
              )}
            </div>

            <dl className="mt-6 grid gap-5 sm:grid-cols-3">
              <div className="border-border-subtle rounded-[10px] border px-5 py-4">
                <dt className="text-ink-muted flex items-center gap-2 text-[12px]">
                  <Users className="text-brand-link size-4" aria-hidden />
                  メンバー
                </dt>
                <dd className="tabular mt-2 text-[20px] font-bold text-ink">
                  {state.seatsUsed}
                  <span className="text-ink-muted text-[13px] font-normal"> / {state.seatLimit} 名</span>
                </dd>
              </div>

              <div className="border-border-subtle rounded-[10px] border px-5 py-4">
                <dt className="text-ink-muted flex items-center gap-2 text-[12px]">
                  <HardDrive className="text-brand-link size-4" aria-hidden />
                  保存容量
                </dt>
                <dd className="tabular mt-2 text-[20px] font-bold text-ink">
                  {formatBytes(state.storageUsedBytes)}
                  <span className="text-ink-muted text-[13px] font-normal">
                    {' '}/ {formatBytes(state.storageQuotaBytes)}
                  </span>
                </dd>
                <div
                  className="bg-surface-sunken mt-2.5 h-1.5 overflow-hidden rounded-full"
                  role="progressbar"
                  aria-valuenow={storagePct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="保存容量の使用率"
                >
                  <div
                    className={storagePct >= 90 ? 'bg-danger h-full' : 'bg-brand-link h-full'}
                    style={{ width: `${storagePct}%` }}
                  />
                </div>
              </div>

              <div className="border-border-subtle rounded-[10px] border px-5 py-4">
                <dt className="text-ink-muted flex items-center gap-2 text-[12px]">
                  <FolderOpen className="text-brand-link size-4" aria-hidden />
                  現場・写真
                </dt>
                <dd className="tabular mt-2 text-[20px] font-bold text-ink">
                  {state.projectCount}
                  <span className="text-ink-muted text-[13px] font-normal"> 現場　/　</span>
                  {state.photoCount.toLocaleString('ja-JP')}
                  <span className="text-ink-muted text-[13px] font-normal"> 枚</span>
                </dd>
              </div>
            </dl>
          </section>
        )}

        {/* ---- プラン ---- */}
        <div className="mx-auto mt-16 max-w-[1090px] text-center">
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

        <PlanCards
          currentPlan={state?.plan ?? 'free'}
          trialEndsAt={state?.trialEndsAt ?? null}
          trialUsed={Boolean(state?.trialEndsAt)}
          canManageBilling={capabilities.has('org.billing')}
        />
      </div>
    </>
  );
}
