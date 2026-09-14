'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireSession } from '@/lib/auth/session';
import { recordAudit } from '@/lib/audit';
import {
  saveTemplate,
  softDeleteTemplate,
  TemplateNotFoundError,
  type TemplateListItem,
} from '@/lib/queries/blackboard-templates';
import { blackboardLayoutSchema } from '@/lib/blackboard/layout-schema';

export type TemplateFormState = {
  error?: string;
  message?: string;
  /** 保存直後の行。新規作成のあと編集を続けられるよう id を画面へ返す。 */
  saved?: TemplateListItem;
  /**
   * 保存と削除で別々の状態を持つため、どちらが新しいかを画面で判断する材料。
   * これがないと、削除したのに直前の保存メッセージが出たままになる。
   */
  at?: number;
};

const saveSchema = z.object({
  templateId: z.string().uuid().nullable(),
  name: z.string().trim().min(1, 'テンプレート名を入力してください。').max(120),
  description: z.string().trim().max(300).nullable(),
  workType: z.string().trim().max(120).nullable(),
  isDefault: z.boolean(),
  // レイアウトは画面から JSON で来るため、必ずスキーマを通してから保存する。
  layout: blackboardLayoutSchema,
});

export async function saveTemplateAction(
  _prev: TemplateFormState,
  formData: FormData,
): Promise<TemplateFormState> {
  const { user, organization, capabilities } = await requireSession();

  if (!capabilities.has('blackboard.template.manage')) {
    return { at: Date.now(), error: 'テンプレートを保存する権限がありません。管理者にお問い合わせください。' };
  }

  let layoutJson: unknown;
  try {
    layoutJson = JSON.parse(String(formData.get('layout') ?? ''));
  } catch {
    return { at: Date.now(), error: 'レイアウトの読み取りに失敗しました。画面を再読み込みしてください。' };
  }

  const parsed = saveSchema.safeParse({
    templateId: (formData.get('templateId') as string) || null,
    name: formData.get('name'),
    description: (formData.get('description') as string) || null,
    workType: (formData.get('workType') as string) || null,
    isDefault: formData.get('isDefault') === 'on' || formData.get('isDefault') === 'true',
    layout: layoutJson,
  });

  if (!parsed.success) {
    return { at: Date.now(), error: parsed.error.issues[0]?.message ?? '入力内容を確認してください。' };
  }

  try {
    const saved = await saveTemplate({
      organizationId: organization.id,
      userId: user.id,
      templateId: parsed.data.templateId,
      name: parsed.data.name,
      description: parsed.data.description,
      workType: parsed.data.workType,
      layout: parsed.data.layout,
      isDefault: parsed.data.isDefault,
    });

    await recordAudit({
      organizationId: organization.id,
      actorId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      action: parsed.data.templateId ? 'blackboard.template.update' : 'blackboard.template.create',
      targetType: 'blackboard_template',
      targetId: saved.id,
      targetLabel: saved.name,
      metadata: { fields: saved.layout.fields.length, isDefault: saved.isDefault },
    });

    revalidatePath('/templates');
    return {
      at: Date.now(),
      saved,
      message: parsed.data.templateId
        ? `「${saved.name}」を保存しました。案件メンバー全員に反映されます。`
        : `「${saved.name}」を作成しました。案件メンバー全員に反映されます。`,
    };
  } catch (error) {
    if (error instanceof TemplateNotFoundError) return { at: Date.now(), error: error.message };
    console.error('[blackboard.template.save] failed', error);
    return { at: Date.now(), error: '保存に失敗しました。時間をおいて再度お試しください。' };
  }
}

export async function deleteTemplateAction(
  _prev: TemplateFormState,
  formData: FormData,
): Promise<TemplateFormState> {
  const { user, organization, capabilities } = await requireSession();

  if (!capabilities.has('blackboard.template.manage')) {
    return { at: Date.now(), error: 'テンプレートを削除する権限がありません。' };
  }

  const templateId = String(formData.get('templateId') ?? '');
  if (!templateId) return { at: Date.now(), error: '対象が指定されていません。' };

  const removed = await softDeleteTemplate(organization.id, templateId);
  if (!removed) return { at: Date.now(), error: 'テンプレートが見つかりません。' };

  await recordAudit({
    organizationId: organization.id,
    actorId: user.id,
    actorName: user.name,
    actorEmail: user.email,
    action: 'blackboard.template.delete',
    targetType: 'blackboard_template',
    targetId: removed.id,
    targetLabel: removed.name,
  });

  revalidatePath('/templates');
  return { at: Date.now(), message: `「${removed.name}」を削除しました。` };
}
