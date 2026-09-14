'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/session';
import { recordAudit } from '@/lib/audit';
import {
  startTrial,
  changePlan,
  TrialAlreadyUsedError,
  SeatLimitError,
  StorageLimitError,
} from '@/lib/queries/organization';
import { isPlanKey, PLANS } from '@/lib/plans';
import { formatDateOnly } from '@/lib/utils';

export type PlanFormState = { error?: string; message?: string; at?: number };

export async function startTrialAction(
  _prev: PlanFormState,
  _formData: FormData,
): Promise<PlanFormState> {
  const { user, organization, capabilities } = await requireSession();

  // 契約の変更は請求権限を持つ人だけ。管理者にも既定では渡していない。
  if (!capabilities.has('org.billing')) {
    return { at: Date.now(), error: 'プランを変更する権限がありません。オーナーにご依頼ください。' };
  }

  try {
    const endsAt = await startTrial(organization.id);

    await recordAudit({
      organizationId: organization.id,
      actorId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      action: 'org.settings_changed',
      targetType: 'organization',
      targetId: organization.id,
      targetLabel: organization.name,
      metadata: { change: 'trial_started', trialEndsAt: endsAt.toISOString() },
    });

    revalidatePath('/settings');
    return {
      at: Date.now(),
      message: `無料トライアルを開始しました。${formatDateOnly(endsAt)} までご利用いただけます。`,
    };
  } catch (error) {
    if (error instanceof TrialAlreadyUsedError) return { at: Date.now(), error: error.message };
    console.error('[plan.trial] failed', error);
    return { at: Date.now(), error: 'トライアルの開始に失敗しました。時間をおいて再度お試しください。' };
  }
}

export async function changePlanAction(
  _prev: PlanFormState,
  formData: FormData,
): Promise<PlanFormState> {
  const { user, organization, capabilities } = await requireSession();

  if (!capabilities.has('org.billing')) {
    return { at: Date.now(), error: 'プランを変更する権限がありません。オーナーにご依頼ください。' };
  }

  const next = String(formData.get('plan') ?? '');
  if (!isPlanKey(next)) return { at: Date.now(), error: '不明なプランです。' };

  /*
   * 決済の連携は未実装。無断で有料プランに切り替えると、請求されないまま
   * 容量だけ増えた状態になるため、申し込みはお問い合わせに回す。
   */
  if (next === 'genba_pro' || next === 'enterprise') {
    return {
      at: Date.now(),
      error: '有料プランのお申し込みはお問い合わせフォームから承っています。',
    };
  }

  try {
    await changePlan(organization.id, next);

    await recordAudit({
      organizationId: organization.id,
      actorId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      action: 'org.settings_changed',
      targetType: 'organization',
      targetId: organization.id,
      targetLabel: organization.name,
      metadata: { change: 'plan_changed', plan: next },
    });

    revalidatePath('/settings');
    return { at: Date.now(), message: `${PLANS[next].name}に変更しました。` };
  } catch (error) {
    if (error instanceof SeatLimitError || error instanceof StorageLimitError) {
      return { at: Date.now(), error: error.message };
    }
    console.error('[plan.change] failed', error);
    return { at: Date.now(), error: 'プランの変更に失敗しました。時間をおいて再度お試しください。' };
  }
}
