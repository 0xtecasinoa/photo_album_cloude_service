import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';

/**
 * 利用者の画面アクセス記録。
 *
 * 監査ログ（audit_logs）とは別物です。監査ログは「何をしたか」を
 * 会社ごとに残すもので、こちらは「どの画面を見たか」を全社横断で残します。
 * 見るのは運営のうち、閲覧を許された1名だけです。
 *
 * 個人の行動が分かる記録なので、会社には結び付けますが、
 * 顧客企業の管理者には見せません。
 */
export const accessLogs = pgTable(
  'access_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /** 未ログインの閲覧も残すため、どちらも null を許す。 */
    userId: uuid('user_id'),
    organizationId: uuid('organization_id'),
    /** 退会後も辿れるよう、その時点の値を控える。 */
    userEmail: text('user_email'),
    userName: text('user_name'),
    organizationName: text('organization_name'),

    path: text('path').notNull(),
    /** 画面の種類。集計で使う（現場・台帳・設定など）。 */
    section: text('section'),
    referrer: text('referrer'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    /** 端末の種類。user_agent から判定したもの。 */
    device: text('device'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('access_logs_created_idx').on(t.createdAt),
    index('access_logs_user_idx').on(t.userId, t.createdAt),
    index('access_logs_path_idx').on(t.path),
  ],
);
