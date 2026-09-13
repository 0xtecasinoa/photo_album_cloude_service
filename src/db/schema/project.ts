import { pgTable, uuid, text, timestamp, boolean, integer, jsonb, index, unique, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations, roles } from './org';
import { users } from './auth';

export const projectStatusEnum = pgEnum('project_status', [
  'planning',   // 準備中
  'active',     // 施工中
  'suspended',  // 中断
  'completed',  // 完成
  'archived',   // 保管
]);

/** 発注区分 — drives whether 電子納品 output is required for this 現場. */
export const contractTypeEnum = pgEnum('contract_type', [
  'public',   // 公共工事
  'private',  // 民間工事
]);

/** 工事 / 現場 */
export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),

    /** 工事名称 — appears on every exported 台帳 and in PHOTO.XML. */
    name: text('name').notNull(),
    /** 工事番号 — customer-facing reference. */
    code: text('code'),
    contractType: contractTypeEnum('contract_type').notNull().default('private'),
    status: projectStatusEnum('status').notNull().default('planning'),

    /** 発注者名 */
    clientName: text('client_name'),
    /** 請負者名 — defaults to the organization but can differ on JV work. */
    contractorName: text('contractor_name'),
    /** 工事実績システム登録番号 (CORINS) */
    corinsNumber: text('corins_number'),

    location: text('location'),
    latitude: text('latitude'),
    longitude: text('longitude'),

    /** 工期 */
    startDate: timestamp('start_date', { withTimezone: true }),
    endDate: timestamp('end_date', { withTimezone: true }),

    /** Defaults pre-filled into every new 黒板 on this 現場. */
    blackboardDefaults: jsonb('blackboard_defaults').$type<Record<string, string>>().notNull().default({}),
    defaultBlackboardTemplateId: uuid('default_blackboard_template_id'),

    coverPhotoId: uuid('cover_photo_id'),
    photoCount: integer('photo_count').notNull().default(0),

    createdById: uuid('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('projects_org_idx').on(t.organizationId),
    index('projects_status_idx').on(t.organizationId, t.status),
    unique('projects_org_code_unique').on(t.organizationId, t.code),
  ],
);

/**
 * Per-現場 access grant. This is what lets a 協力会社 user from another
 * organization see exactly one project and nothing else.
 */
export const projectMembers = pgTable(
  'project_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'restrict' }),
    /** True when the user's organization differs from the project's owner org. */
    isExternal: boolean('is_external').notNull().default(false),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    grantedById: uuid('granted_by_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('project_members_unique').on(t.projectId, t.userId),
    index('project_members_user_idx').on(t.userId),
    index('project_members_project_idx').on(t.projectId),
  ],
);

/** 工事写真台帳 / アルバム — the grouping that becomes one Excel or PDF output. */
export const albums = pgTable(
  'albums',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    /** 写真区分 this album collects, when it maps to one. */
    photoCategory: text('photo_category'),
    sortOrder: integer('sort_order').notNull().default(0),
    photoCount: integer('photo_count').notNull().default(0),
    createdById: uuid('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [index('albums_project_idx').on(t.projectId)],
);

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, { fields: [projects.organizationId], references: [organizations.id] }),
  members: many(projectMembers),
  albums: many(albums),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, { fields: [projectMembers.projectId], references: [projects.id] }),
  user: one(users, { fields: [projectMembers.userId], references: [users.id] }),
  role: one(roles, { fields: [projectMembers.roleId], references: [roles.id] }),
}));

export const albumsRelations = relations(albums, ({ one }) => ({
  project: one(projects, { fields: [albums.projectId], references: [projects.id] }),
}));
