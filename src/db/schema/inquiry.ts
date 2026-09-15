import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';

/**
 * サイトからのお問い合わせ。
 *
 * ログイン前のフォームからも届くため、組織には紐付きません
 * （紐付けると、まだ組織のない見込み客の問い合わせが保存できない）。
 * ログイン中に送られた場合だけ、どの組織からかを控えます。
 */
export const contactInquiries = pgTable(
  'contact_inquiries',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    company: text('company').notNull(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    topic: text('topic').notNull(),
    message: text('message'),
    /** 料金表のどのプランから来たか。営業が優先度を判断するために使う。 */
    planInterest: text('plan_interest'),

    /** ログイン中に送られた場合のみ。 */
    organizationId: uuid('organization_id'),
    userId: uuid('user_id'),

    status: text('status').notNull().default('new'), // new | in_progress | closed
    /** 運営が返した内容の控え。誰が何と答えたかを残すため。 */
    response: text('response'),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
    respondedById: uuid('responded_by_id'),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('contact_inquiries_created_idx').on(t.createdAt),
    index('contact_inquiries_status_idx').on(t.status),
  ],
);
