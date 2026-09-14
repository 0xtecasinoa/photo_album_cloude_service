import { and, asc, eq, isNull, ne, sql } from 'drizzle-orm';
import { db } from '@/db';
import { blackboardTemplates } from '@/db/schema';
import type { BlackboardLayout } from '@/lib/blackboard/layout-schema';

export type TemplateListItem = {
  id: string;
  name: string;
  description: string | null;
  workType: string | null;
  layout: BlackboardLayout;
  isDefault: boolean;
  isLocked: boolean;
  updatedAt: Date;
};

export async function listTemplates(organizationId: string): Promise<TemplateListItem[]> {
  return db
    .select({
      id: blackboardTemplates.id,
      name: blackboardTemplates.name,
      description: blackboardTemplates.description,
      workType: blackboardTemplates.workType,
      layout: blackboardTemplates.layout,
      isDefault: blackboardTemplates.isDefault,
      isLocked: blackboardTemplates.isLocked,
      updatedAt: blackboardTemplates.updatedAt,
    })
    .from(blackboardTemplates)
    .where(
      and(
        eq(blackboardTemplates.organizationId, organizationId),
        isNull(blackboardTemplates.deletedAt),
      ),
    )
    // 既定を先頭に。撮影時に最初に出るものが一覧でも最初に見えるほうが迷わない。
    .orderBy(sql`${blackboardTemplates.isDefault} desc`, asc(blackboardTemplates.sortOrder), asc(blackboardTemplates.createdAt));
}

export type SaveTemplateInput = {
  organizationId: string;
  userId: string;
  /** 未指定なら新規作成。 */
  templateId?: string | null;
  name: string;
  description?: string | null;
  workType?: string | null;
  layout: BlackboardLayout;
  isDefault?: boolean;
};

export class TemplateNotFoundError extends Error {
  constructor() {
    super('テンプレートが見つかりません。');
    this.name = 'TemplateNotFoundError';
  }
}

export async function saveTemplate(input: SaveTemplateInput): Promise<TemplateListItem> {
  return db.transaction(async (tx) => {
    let row;

    if (input.templateId) {
      // 組織を条件に入れる。他社のテンプレート id を送られても書き換わらないように。
      const [updated] = await tx
        .update(blackboardTemplates)
        .set({
          name: input.name,
          description: input.description ?? null,
          workType: input.workType ?? null,
          layout: input.layout,
          isDefault: input.isDefault ?? false,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(blackboardTemplates.id, input.templateId),
            eq(blackboardTemplates.organizationId, input.organizationId),
            isNull(blackboardTemplates.deletedAt),
          ),
        )
        .returning();
      if (!updated) throw new TemplateNotFoundError();
      row = updated;
    } else {
      const [created] = await tx
        .insert(blackboardTemplates)
        .values({
          organizationId: input.organizationId,
          name: input.name,
          description: input.description ?? null,
          workType: input.workType ?? null,
          layout: input.layout,
          isDefault: input.isDefault ?? false,
          createdById: input.userId,
        })
        .returning();
      row = created!;
    }

    // 既定はひとつだけ。複数あると撮影時にどれが出るか決まらない。
    if (row.isDefault) {
      await tx
        .update(blackboardTemplates)
        .set({ isDefault: false })
        .where(
          and(
            eq(blackboardTemplates.organizationId, input.organizationId),
            ne(blackboardTemplates.id, row.id),
          ),
        );
    }

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      workType: row.workType,
      layout: row.layout,
      isDefault: row.isDefault,
      isLocked: row.isLocked,
      updatedAt: row.updatedAt,
    };
  });
}

/** 論理削除。過去の写真がどのテンプレートで撮られたかを追えるよう行は残す。 */
export async function softDeleteTemplate(
  organizationId: string,
  templateId: string,
): Promise<{ id: string; name: string } | null> {
  const [row] = await db
    .update(blackboardTemplates)
    .set({ deletedAt: new Date(), isDefault: false })
    .where(
      and(
        eq(blackboardTemplates.id, templateId),
        eq(blackboardTemplates.organizationId, organizationId),
        isNull(blackboardTemplates.deletedAt),
      ),
    )
    .returning({ id: blackboardTemplates.id, name: blackboardTemplates.name });
  return row ?? null;
}
