import { pgTable, uuid, text, timestamp, boolean, integer, bigint, jsonb, index, pgEnum, doublePrecision } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { organizations } from './org';
import { users } from './auth';
import { projects, albums } from './project';

/** 写真-大分類 (デジタル写真管理情報基準) */
export const photoLargeClassEnum = pgEnum('photo_large_class', ['工事', '測量', '調査', '地質']);

/** 写真区分 (デジタル写真管理情報基準) */
export const photoCategoryEnum = pgEnum('photo_category', [
  '着手前及び完成写真',
  '施工状況写真',
  '安全管理写真',
  '使用材料写真',
  '品質管理写真',
  '出来形管理写真',
  '災害写真',
  '事故写真',
  'その他',
]);

/**
 * Result of verifying the JACIC 小黒板情報電子化 tamper-detection payload.
 * 'unsigned' means the photo arrived without a blackboard payload — legitimate for
 * 民間工事, but it cannot be included in a 電子納品 export.
 */
export const integrityStatusEnum = pgEnum('integrity_status', [
  'unsigned',
  'pending',
  'valid',
  'invalid',
  'error',
]);

export const uploadSourceEnum = pgEnum('upload_source', [
  'mobile_camera', // captured in our app — the only source that can be JACIC-signed
  'web_upload',
  'import',
  'api',
]);

export const photos = pgTable(
  'photos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    albumId: uuid('album_id').references(() => albums.id, { onDelete: 'set null' }),

    // ---- storage ----
    storageKey: text('storage_key').notNull(),
    thumbnailKey: text('thumbnail_key'),
    /**
     * The untouched bytes as they left the camera. 電子納品 forbids editing, so the
     * original is kept immutable and every derived rendition points back at it.
     */
    originalStorageKey: text('original_storage_key'),
    originalFilename: text('original_filename'),
    /** 写真ファイル名 as written into PHOTO.XML, e.g. P0000001.JPG */
    deliveryFilename: text('delivery_filename'),

    mimeType: text('mime_type').notNull().default('image/jpeg'),
    fileSize: bigint('file_size', { mode: 'number' }).notNull(),
    width: integer('width'),
    height: integer('height'),
    /** sha256 of the stored bytes — dedupe and integrity baseline. */
    contentHash: text('content_hash').notNull(),

    // ---- date & time (the headline requirement) ----
    /** EXIF DateTimeOriginal. Falls back to upload time only when EXIF is absent. */
    takenAt: timestamp('taken_at', { withTimezone: true }).notNull(),
    takenAtSource: text('taken_at_source').notNull().default('exif'), // exif | filesystem | manual | upload
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
    uploadedById: uuid('uploaded_by_id').references(() => users.id, { onDelete: 'set null' }),
    uploadSource: uploadSourceEnum('upload_source').notNull().default('web_upload'),

    // ---- location ----
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    altitude: doublePrecision('altitude'),

    /** Full EXIF block, kept verbatim for audit and re-derivation. */
    exif: jsonb('exif').$type<Record<string, unknown>>(),

    // ---- 電子小黒板 / JACIC 小黒板情報電子化 ----
    /** Rendered blackboard field values as burned into the image at capture time. */
    blackboardData: jsonb('blackboard_data').$type<Record<string, string>>(),
    blackboardTemplateId: uuid('blackboard_template_id'),
    /** JACIC spec version this photo was signed under — Ver.1 and Ver.1.1 are not cross-readable. */
    jacicVersion: text('jacic_version'),
    /** Tamper-detection payload extracted from the JPEG APP segment. */
    integritySignature: text('integrity_signature'),
    integrityStatus: integrityStatusEnum('integrity_status').notNull().default('unsigned'),
    integrityCheckedAt: timestamp('integrity_checked_at', { withTimezone: true }),

    // ---- 電子納品 classification ----
    largeClass: photoLargeClassEnum('large_class').default('工事'),
    category: photoCategoryEnum('category'),
    workType: text('work_type'),     // 工種
    workKind: text('work_kind'),     // 種別
    workDetail: text('work_detail'), // 細別
    title: text('title'),            // 写真タイトル
    shootingLocation: text('shooting_location'), // 撮影箇所
    controlValue: text('control_value'),         // 施工管理値
    contractorNote: text('contractor_note'),     // 請負者説明文
    /** 代表写真 */
    isRepresentative: boolean('is_representative').notNull().default(false),
    /** 提出頻度写真 */
    isFrequencySubmission: boolean('is_frequency_submission').notNull().default(false),

    sortOrder: integer('sort_order').notNull().default(0),

    // ---- lifecycle ----
    /** Soft delete: the audit trail must survive the delete, and 復元 needs the row. */
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    deletedById: uuid('deleted_by_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('photos_project_idx').on(t.projectId),
    index('photos_album_idx').on(t.albumId),
    index('photos_taken_at_idx').on(t.projectId, t.takenAt),
    index('photos_org_idx').on(t.organizationId),
    index('photos_content_hash_idx').on(t.organizationId, t.contentHash),
    index('photos_category_idx').on(t.projectId, t.category),
    index('photos_deleted_idx').on(t.deletedAt),
  ],
);

/** 図面 / 参考図 — the DRA half of a 電子納品 PHOTO folder. */
export const drawings = pgTable(
  'drawings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    storageKey: text('storage_key').notNull(),
    thumbnailKey: text('thumbnail_key'),
    deliveryFilename: text('delivery_filename'),
    mimeType: text('mime_type').notNull(),
    fileSize: bigint('file_size', { mode: 'number' }).notNull(),
    uploadedById: uuid('uploaded_by_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [index('drawings_project_idx').on(t.projectId)],
);

/** Links a photo to its 参考図. */
export const photoDrawings = pgTable(
  'photo_drawings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    photoId: uuid('photo_id').notNull().references(() => photos.id, { onDelete: 'cascade' }),
    drawingId: uuid('drawing_id').notNull().references(() => drawings.id, { onDelete: 'cascade' }),
  },
  (t) => [index('photo_drawings_photo_idx').on(t.photoId)],
);

export const photosRelations = relations(photos, ({ one }) => ({
  project: one(projects, { fields: [photos.projectId], references: [projects.id] }),
  album: one(albums, { fields: [photos.albumId], references: [albums.id] }),
  uploadedBy: one(users, { fields: [photos.uploadedById], references: [users.id] }),
}));
