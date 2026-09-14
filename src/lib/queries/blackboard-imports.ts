import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { blackboardImports } from '@/db/schema';
import type { BlackboardLayout } from '@/lib/blackboard/layout-schema';

export type ImportListItem = {
  id: string;
  status: string;
  sourceStorageKey: string;
  confidence: Record<string, number> | null;
  draftLayout: BlackboardLayout | null;
  errorMessage: string | null;
  resultTemplateId: string | null;
  createdAt: Date;
};

export async function listImports(organizationId: string): Promise<ImportListItem[]> {
  return db
    .select({
      id: blackboardImports.id,
      status: blackboardImports.status,
      sourceStorageKey: blackboardImports.sourceStorageKey,
      confidence: blackboardImports.confidence,
      draftLayout: blackboardImports.draftLayout,
      errorMessage: blackboardImports.errorMessage,
      resultTemplateId: blackboardImports.resultTemplateId,
      createdAt: blackboardImports.createdAt,
    })
    .from(blackboardImports)
    .where(eq(blackboardImports.organizationId, organizationId))
    .orderBy(desc(blackboardImports.createdAt))
    .limit(20);
}

export async function getImport(organizationId: string, importId: string) {
  const [row] = await db
    .select()
    .from(blackboardImports)
    .where(
      and(
        eq(blackboardImports.id, importId),
        eq(blackboardImports.organizationId, organizationId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function markImportConfirmed(
  organizationId: string,
  importId: string,
  templateId: string,
): Promise<void> {
  await db
    .update(blackboardImports)
    .set({ status: 'confirmed', resultTemplateId: templateId, updatedAt: new Date() })
    .where(
      and(
        eq(blackboardImports.id, importId),
        eq(blackboardImports.organizationId, organizationId),
      ),
    );
}
