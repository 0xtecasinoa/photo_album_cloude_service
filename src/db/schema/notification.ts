import { pgTable, uuid, text, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { organizations } from './org';
import { users } from './auth';

/**
 * 運営から利用者へのお知らせ。
 *
 * 宛先の考え方:
 *   organizationId = null  … 全社へ（メンテナンス告知など）
 *   organizationId = 指定  … その会社の全員へ
 *
 * 写真の署名不備のような「データから導ける警告」はここに溜めません。
 * 状況が変われば消えるべきものを行として持つと、直したのに警告が残ります。
 */
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** null = 全社宛。 */
    organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'cascade' }),

    /** info | warning | critical — 画面での見せ方が変わります。 */
    level: text('level').notNull().default('info'),
    title: text('title').notNull(),
    body: text('body'),
    /** 押したときの遷移先。同一サイトのパスのみ。 */
    linkUrl: text('link_url'),

    createdById: uuid('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    /** 掲示を終える日時。null なら手で消すまで出続けます。 */
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('notifications_org_idx').on(t.organizationId, t.createdAt),
    index('notifications_created_idx').on(t.createdAt),
  ],
);

/**
 * 既読の記録。
 *
 * 未読件数は「お知らせの総数 − 既読の数」で出します。お知らせ側に
 * 既読フラグを持たせると、全社宛を1人が読んだだけで全員既読になります。
 */
export const notificationReads = pgTable(
  'notification_reads',
  {
    notificationId: uuid('notification_id')
      .notNull()
      .references(() => notifications.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    readAt: timestamp('read_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('notification_reads_unique').on(t.notificationId, t.userId),
    index('notification_reads_user_idx').on(t.userId),
  ],
);
