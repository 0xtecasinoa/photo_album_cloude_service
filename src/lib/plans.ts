/**
 * プランの定義。
 *
 * 容量や人数の上限は画面と実際の制限で必ず同じ値を使う必要があるため、
 * ここ1か所にまとめています。カード表示と、プラン変更時の枠の書き換えが
 * 別々の数字を持つと、「100GBと書いてあるのに入らない」が起きます。
 */

export const PLAN_KEYS = ['free', 'trial', 'genba_pro', 'enterprise'] as const;
export type PlanKey = (typeof PLAN_KEYS)[number];

const GB = 1024 ** 3;

export type PlanDefinition = {
  key: PlanKey;
  name: string;
  audience: string;
  price: string;
  priceNote: string;
  features: string[];
  storageQuotaBytes: number;
  seatLimit: number;
  /** カードとして並べるか。trial は genba_pro の一状態なので出さない。 */
  listed: boolean;
  featured?: boolean;
  ribbon?: string;
};

export const PLANS: Record<PlanKey, PlanDefinition> = {
  free: {
    key: 'free',
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
    storageQuotaBytes: 2 * GB,
    seatLimit: 2,
    listed: true,
  },
  trial: {
    key: 'trial',
    name: '現場プロ クラウド（無料トライアル）',
    audience: '14日間、現場プロ クラウドのすべての機能をお試しいただけます',
    price: '¥0',
    priceNote: '14日間',
    features: [],
    storageQuotaBytes: 100 * GB,
    seatLimit: 10,
    listed: false,
  },
  genba_pro: {
    key: 'genba_pro',
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
    storageQuotaBytes: 100 * GB,
    seatLimit: 50,
    listed: true,
    featured: true,
    ribbon: '一番人気★現場オススメ',
  },
  enterprise: {
    key: 'enterprise',
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
    storageQuotaBytes: 1024 * GB,
    seatLimit: 1000,
    listed: true,
  },
};

export const LISTED_PLANS = PLAN_KEYS.map((k) => PLANS[k]).filter((p) => p.listed);

export function isPlanKey(value: string): value is PlanKey {
  return (PLAN_KEYS as readonly string[]).includes(value);
}

export function planName(value: string): string {
  return isPlanKey(value) ? PLANS[value].name : value;
}

/** トライアルは現場プロの一状態。カード上では現場プロを「ご利用中」として扱う。 */
export function cardPlanFor(current: string): PlanKey {
  return current === 'trial' ? 'genba_pro' : (isPlanKey(current) ? current : 'free');
}

export const TRIAL_DAYS = 14;

/** 残り日数。切り上げるので、期限当日は「残り1日」と出る。 */
export function trialDaysLeft(trialEndsAt: Date | null): number | null {
  if (!trialEndsAt) return null;
  const ms = trialEndsAt.getTime() - Date.now();
  return ms <= 0 ? 0 : Math.ceil(ms / (24 * 60 * 60 * 1000));
}
