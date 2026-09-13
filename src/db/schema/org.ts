import { pgTable, uuid, text, timestamp, bigint, boolean, jsonb, index, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import type { Capability } from '@/lib/acl/capabilities';

/** 会社 — the tenant root. Every row in the system hangs off one of these. */
export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    nameKana: text('name_kana'),
    /** URL-safe tenant key, used for login hints and share URLs. */
    slug: text('slug').notNull(),
    postalCode: text('postal_code'),
    address: text('address'),
    phone: text('phone'),
    /** 建設業許可番号 — shown on exported 台帳 covers. */
    licenseNumber: text('license_number'),
    logoStorageKey: text('logo_storage_key'),

    plan: text('plan').notNull().default('trial'),
    seatLimit: bigint('seat_limit', { mode: 'number' }).notNull().default(10),
    storageQuotaBytes: bigint('storage_quota_bytes', { mode: 'number' }).notNull().default(107374182400), // 100GB
    storageUsedBytes: bigint('storage_used_bytes', { mode: 'number' }).notNull().default(0),
    trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),

    /** Enterprise buyers ask for this by name. Empty array = unrestricted. */
    allowedIpRanges: jsonb('allowed_ip_ranges').$type<string[]>().notNull().default([]),
    requireTwoFactor: boolean('require_two_factor').notNull().default(false),

    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('organizations_slug_unique').on(t.slug)],
);

/**
 * Roles are per-organization rows, not hardcoded enums, so a customer can build
 * "写真は消せるが台帳は消せない" without us shipping code.
 * System roles are seeded per org with isSystem = true and cannot be deleted.
 */
export const roles = pgTable(
  'roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    /** Stable key for seeded roles ('owner', 'admin', ...). Null for custom roles. */
    slug: text('slug'),
    name: text('name').notNull(),
    description: text('description'),
    capabilities: jsonb('capabilities').$type<Capability[]>().notNull().default([]),
    isSystem: boolean('is_system').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('roles_org_idx').on(t.organizationId),
    unique('roles_org_slug_unique').on(t.organizationId, t.slug),
  ],
);

export const organizationsRelations = relations(organizations, ({ many }) => ({
  roles: many(roles),
}));

export const rolesRelations = relations(roles, ({ one }) => ({
  organization: one(organizations, {
    fields: [roles.organizationId],
    references: [organizations.id],
  }),
}));
