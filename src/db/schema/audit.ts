import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { organizations } from './org';
import { users } from './auth';

/**
 * Append-only audit trail.
 *
 * This is the feature that actually beats BOX for this customer: BOX can tell you
 * a file was deleted, but not that 出来形管理写真 #42 on 現場 A was deleted by a
 * subcontractor two days before handover. Never UPDATE or DELETE rows here.
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    /** Nullable so system actions and deleted users still leave a record. */
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    actorEmail: text('actor_email'),
    actorName: text('actor_name'),

    /** e.g. 'photo.delete', 'member.role_changed', 'export.denshi_nouhin' */
    action: text('action').notNull(),
    targetType: text('target_type'),
    targetId: uuid('target_id'),
    targetLabel: text('target_label'),
    projectId: uuid('project_id'),

    /** Before/after diff for permission and metadata changes. */
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),

    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('audit_logs_org_created_idx').on(t.organizationId, t.createdAt),
    index('audit_logs_actor_idx').on(t.actorId),
    index('audit_logs_target_idx').on(t.targetType, t.targetId),
    index('audit_logs_project_idx').on(t.projectId),
  ],
);
