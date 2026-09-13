import { pgTable, uuid, text, timestamp, boolean, integer, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from './org';
import { users } from './auth';
import type { BlackboardLayout } from '@/lib/blackboard/layout-schema';

/**
 * 電子小黒板テンプレート.
 *
 * The layout lives in JSONB rather than columns because the customer designs it:
 * arbitrary rows, per-field typography, per-field data source. `isLocked` is what
 * stops a site worker from reformatting a template the office standardised on.
 */
export const blackboardTemplates = pgTable(
  'blackboard_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),

    name: text('name').notNull(),
    description: text('description'),
    /** 工種 this template is intended for; drives the default suggestion on upload. */
    workType: text('work_type'),

    layout: jsonb('layout').$type<BlackboardLayout>().notNull(),

    /** Preview render, regenerated whenever the layout changes. */
    previewStorageKey: text('preview_storage_key'),

    /** Locked templates can only be edited by blackboard.template.manage holders. */
    isLocked: boolean('is_locked').notNull().default(false),
    isDefault: boolean('is_default').notNull().default(false),
    /** Set when the template was produced by OCR of a handwritten 看板. */
    sourcePhotoStorageKey: text('source_photo_storage_key'),
    sortOrder: integer('sort_order').notNull().default(0),

    createdById: uuid('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('blackboard_templates_org_idx').on(t.organizationId),
    index('blackboard_templates_worktype_idx').on(t.organizationId, t.workType),
  ],
);

/**
 * An OCR import job for a handwritten 看板 photo.
 * Deliberately a review queue, not a fire-and-forget conversion: handwritten
 * Japanese recognition is not reliable enough to write straight into a template
 * that ends up on delivered photos.
 */
export const blackboardImports = pgTable(
  'blackboard_imports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    sourceStorageKey: text('source_storage_key').notNull(),
    status: text('status').notNull().default('pending'), // pending | processing | needs_review | confirmed | failed
    /** Raw OCR output before human correction. */
    ocrResult: jsonb('ocr_result').$type<Record<string, unknown>>(),
    /** Per-field recognition confidence, so the review UI can flag the risky cells. */
    confidence: jsonb('confidence').$type<Record<string, number>>(),
    draftLayout: jsonb('draft_layout').$type<BlackboardLayout>(),
    resultTemplateId: uuid('result_template_id').references(() => blackboardTemplates.id, { onDelete: 'set null' }),
    errorMessage: text('error_message'),
    createdById: uuid('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('blackboard_imports_org_idx').on(t.organizationId, t.status)],
);

export const blackboardTemplatesRelations = relations(blackboardTemplates, ({ one }) => ({
  organization: one(organizations, {
    fields: [blackboardTemplates.organizationId],
    references: [organizations.id],
  }),
}));
