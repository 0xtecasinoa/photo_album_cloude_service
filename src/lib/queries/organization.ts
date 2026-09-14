import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import { organizations, users, projects, photos } from '@/db/schema';
import { PLANS, type PlanKey, TRIAL_DAYS } from '@/lib/plans';

export type OrganizationPlanState = {
  plan: string;
  trialEndsAt: Date | null;
  seatLimit: number;
  seatsUsed: number;
  storageQuotaBytes: number;
  storageUsedBytes: number;
  projectCount: number;
  photoCount: number;
};

/**
 * プラン画面に出す現在の契約状況。
 *
 * 保存容量は organizations.storage_used_bytes（更新漏れでずれうるカウンタ）ではなく
 * 写真の実サイズを足して出します。画面の数字と実際の使用量が食い違うと、
 * 「まだ空いているはずなのに入らない」という問い合わせになるためです。
 */
export async function getOrganizationPlanState(
  organizationId: string,
): Promise<OrganizationPlanState | null> {
  const [org] = await db
    .select({
      plan: organizations.plan,
      trialEndsAt: organizations.trialEndsAt,
      seatLimit: organizations.seatLimit,
      storageQuotaBytes: organizations.storageQuotaBytes,
    })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!org) return null;

  const [seats] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.organizationId, organizationId), eq(users.isActive, true)));

  const [usage] = await db
    .select({
      projectCount: sql<number>`count(distinct ${projects.id})::int`,
      photoCount: sql<number>`count(${photos.id}) filter (where ${photos.deletedAt} is null)::int`,
      storageUsedBytes: sql<string | number | null>`coalesce(sum(${photos.fileSize}) filter (where ${photos.deletedAt} is null), 0)`,
    })
    .from(projects)
    .leftJoin(photos, eq(photos.projectId, projects.id))
    .where(and(eq(projects.organizationId, organizationId), isNull(projects.deletedAt)));

  return {
    ...org,
    seatsUsed: seats?.n ?? 0,
    projectCount: usage?.projectCount ?? 0,
    photoCount: usage?.photoCount ?? 0,
    // sum() は桁あふれを避けるため文字列で返ることがある。
    storageUsedBytes: Number(usage?.storageUsedBytes ?? 0),
  };
}

export class TrialAlreadyUsedError extends Error {
  constructor() {
    super('この組織ではすでに無料トライアルをご利用済みです。');
    this.name = 'TrialAlreadyUsedError';
  }
}

export class SeatLimitError extends Error {
  constructor(seatsUsed: number, seatLimit: number) {
    super(
      `現在 ${seatsUsed} 名が在籍しており、変更後のプランの上限（${seatLimit} 名）を超えます。` +
        `先にメンバーのアクセスを停止してください。`,
    );
    this.name = 'SeatLimitError';
  }
}

export class StorageLimitError extends Error {
  constructor() {
    super('現在の保存容量が変更後のプランの上限を超えています。先に写真を整理してください。');
    this.name = 'StorageLimitError';
  }
}

/** 14日間の無料トライアルを開始する。1組織につき1回だけ。 */
export async function startTrial(organizationId: string): Promise<Date> {
  const [org] = await db
    .select({ plan: organizations.plan, trialEndsAt: organizations.trialEndsAt })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!org) throw new Error(`organization not found: ${organizationId}`);
  // 開始済みの記録があれば、期限が過ぎていても再開はさせない。
  if (org.trialEndsAt) throw new TrialAlreadyUsedError();

  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const preset = PLANS.trial;

  await db
    .update(organizations)
    .set({
      plan: 'trial',
      trialEndsAt,
      storageQuotaBytes: preset.storageQuotaBytes,
      seatLimit: preset.seatLimit,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, organizationId));

  return trialEndsAt;
}

/**
 * プランを切り替える。
 *
 * 枠を縮める向きの変更は、いまの利用量が収まるか先に確かめます。
 * 収まらないまま切り替えると、すでにある写真やメンバーが
 * 上限超過の状態で取り残されます。
 */
export async function changePlan(organizationId: string, next: PlanKey): Promise<void> {
  const state = await getOrganizationPlanState(organizationId);
  if (!state) throw new Error(`organization not found: ${organizationId}`);

  const preset = PLANS[next];
  if (state.seatsUsed > preset.seatLimit) {
    throw new SeatLimitError(state.seatsUsed, preset.seatLimit);
  }
  if (state.storageUsedBytes > preset.storageQuotaBytes) {
    throw new StorageLimitError();
  }

  await db
    .update(organizations)
    .set({
      plan: next,
      storageQuotaBytes: preset.storageQuotaBytes,
      seatLimit: preset.seatLimit,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, organizationId));
}
