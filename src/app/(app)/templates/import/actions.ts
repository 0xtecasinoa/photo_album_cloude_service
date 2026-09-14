'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { z } from 'zod';
import { requireSession } from '@/lib/auth/session';
import { recordAudit } from '@/lib/audit';
import { saveTemplate } from '@/lib/queries/blackboard-templates';
import { getImport, markImportConfirmed } from '@/lib/queries/blackboard-imports';
import { blackboardLayoutSchema } from '@/lib/blackboard/layout-schema';

export type ImportReviewState = { error?: string };

const schema = z.object({
  importId: z.string().uuid(),
  name: z.string().trim().min(1, 'テンプレート名を入力してください。').max(120),
  workType: z.string().trim().max(120).nullable(),
  layout: blackboardLayoutSchema,
});

/**
 * 確認済みの内容をテンプレートとして確定する。
 *
 * 読み取り結果から直接テンプレートを作る経路は用意していません。
 * 人が一度見てからでないと、誤認識のまま全ての写真に焼き付いてしまうためです。
 */
export async function confirmImportAction(
  _prev: ImportReviewState,
  formData: FormData,
): Promise<ImportReviewState> {
  const { user, organization, capabilities } = await requireSession();

  if (!capabilities.has('blackboard.template.manage')) {
    return { error: 'テンプレートを作成する権限がありません。' };
  }

  let layoutJson: unknown;
  try {
    layoutJson = JSON.parse(String(formData.get('layout') ?? ''));
  } catch {
    return { error: 'レイアウトの読み取りに失敗しました。画面を再読み込みしてください。' };
  }

  const parsed = schema.safeParse({
    importId: formData.get('importId'),
    name: formData.get('name'),
    workType: (formData.get('workType') as string) || null,
    layout: layoutJson,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '入力内容を確認してください。' };
  }

  try {
    const row = await getImport(organization.id, parsed.data.importId);
    if (!row) return { error: '取り込みデータが見つかりません。' };

    const template = await saveTemplate({
      organizationId: organization.id,
      userId: user.id,
      name: parsed.data.name,
      workType: parsed.data.workType,
      layout: parsed.data.layout,
    });

    await markImportConfirmed(organization.id, parsed.data.importId, template.id);

    await recordAudit({
      organizationId: organization.id,
      actorId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      action: 'blackboard.template.create',
      targetType: 'blackboard_template',
      targetId: template.id,
      targetLabel: template.name,
      metadata: { fromImport: parsed.data.importId, fields: template.layout.fields.length },
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error('[blackboard.import.confirm] failed', error);
    return { error: '保存に失敗しました。時間をおいて再度お試しください。' };
  }

  revalidatePath('/templates');
  revalidatePath('/templates/import');
  redirect('/templates');
}
