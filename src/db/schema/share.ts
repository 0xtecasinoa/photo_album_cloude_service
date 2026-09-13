import { pgTable, uuid, text, timestamp, boolean, integer, index, unique } from 'drizzle-orm/pg-core';
import { organizations } from './org';
import { users } from './auth';
import { projects, albums } from './project';

/**
 * Expiring external share link — the 協力会社 / 発注者 handoff that would otherwise
 * be done by emailing a BOX link.
 */
export const shareLinks = pgTable(
  'share_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
    albumId: uuid('album_id').references(() => albums.id, { onDelete: 'cascade' }),

    token: text('token').notNull(),
    name: text('name'),
    passwordHash: text('password_hash'),
    allowDownload: boolean('allow_download').notNull().default(false),
    /** Null = unlimited. Decremented on each successful open. */
    maxViews: integer('max_views'),
    viewCount: integer('view_count').notNull().default(0),

    expiresAt: timestamp('expires_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdById: uuid('created_by_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('share_links_token_unique').on(t.token),
    index('share_links_project_idx').on(t.projectId),
  ],
);
