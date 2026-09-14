import { pgTable, uuid, text, timestamp, boolean, integer, primaryKey, index, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { AdapterAccountType } from 'next-auth/adapters';
import { organizations, roles } from './org';

/**
 * Auth.js-compatible users table, extended with our own columns.
 * A user belongs to exactly one organization — their employer. 協力会社 staff get
 * their own organization and are granted access to a customer's 現場 through
 * projectMembers, which keeps cross-company sharing from leaking tenant data.
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name'),
    email: text('email').notNull(),
    emailVerified: timestamp('email_verified', { withTimezone: true }),
    image: text('image'),

    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    /** Org-wide default role. Project-level roles override this per 現場. */
    defaultRoleId: uuid('default_role_id').references(() => roles.id, { onDelete: 'set null' }),

    nameKana: text('name_kana'),
    passwordHash: text('password_hash'),
    phone: text('phone'),
    department: text('department'),
    jobTitle: text('job_title'),

    twoFactorSecret: text('two_factor_secret'),
    twoFactorEnabledAt: timestamp('two_factor_enabled_at', { withTimezone: true }),

    isActive: boolean('is_active').notNull().default(true),
    /**
     * サービス運営側の管理者。テナントの境界を越えて全社の情報を見られるため、
     * 画面からは絶対に立てられないようにしてあります（DB で直接付与する運用）。
     * 顧客企業の「管理者」ロールとは別物です。
     */
    isPlatformAdmin: boolean('is_platform_admin').notNull().default(false),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('users_email_unique').on(t.email),
    index('users_org_idx').on(t.organizationId),
  ],
);

export const accounts = pgTable(
  'accounts',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccountType>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { withTimezone: true }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

export const usersRelations = relations(users, ({ one }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  defaultRole: one(roles, {
    fields: [users.defaultRoleId],
    references: [roles.id],
  }),
}));
