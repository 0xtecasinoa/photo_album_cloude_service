'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireSession } from '@/lib/auth/session';
import { createProject, DuplicateProjectCodeError, softDeleteProject } from '@/lib/queries/projects';
import { recordAudit } from '@/lib/audit';
import type { Capability } from '@/lib/acl/capabilities';

export type ProjectFormState = {
  error?: string;
  fieldErrors?: Partial<Record<'name' | 'code' | 'clientName' | 'contractorName' | 'location', string>>;
};

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

const createSchema = z.object({
  name: z.string().trim().min(1, '工事名称を入力してください。').max(200),
  code: optionalText(60),
  contractType: z.enum(['public', 'private']),
  clientName: optionalText(120),
  contractorName: optionalText(120),
  location: optionalText(200),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
});

function parseDate(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00+09:00`); // 入力は日本時間の日付として扱う
  return Number.isNaN(d.getTime()) ? null : d;
}

function assertCan(capabilities: Set<Capability>, capability: Capability) {
  if (!capabilities.has(capability)) {
    throw new Error('この操作を行う権限がありません。');
  }
}

export async function createProjectAction(
  _prev: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const { user, organization, capabilities } = await requireSession();

  if (!capabilities.has('project.create')) {
    return { error: '現場を作成する権限がありません。管理者にお問い合わせください。' };
  }

  const parsed = createSchema.safeParse({
    name: formData.get('name'),
    code: formData.get('code') || undefined,
    contractType: formData.get('contractType') || 'private',
    clientName: formData.get('clientName') || undefined,
    contractorName: formData.get('contractorName') || undefined,
    location: formData.get('location') || undefined,
    startDate: formData.get('startDate') || undefined,
    endDate: formData.get('endDate') || undefined,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const k = String(i.path[0] ?? '');
      if (k && !fieldErrors[k]) fieldErrors[k] = i.message;
    }
    return { fieldErrors };
  }

  let projectId: string;
  try {
    const project = await createProject({
      organizationId: organization.id,
      createdById: user.id,
      ...parsed.data,
      startDate: parseDate(parsed.data.startDate),
      endDate: parseDate(parsed.data.endDate),
    });
    projectId = project.id;

    await recordAudit({
      organizationId: organization.id,
      actorId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      action: 'project.create',
      targetType: 'project',
      targetId: project.id,
      targetLabel: project.name,
      projectId: project.id,
      metadata: { contractType: parsed.data.contractType, code: parsed.data.code },
    });
  } catch (error) {
    if (error instanceof DuplicateProjectCodeError) {
      return { fieldErrors: { code: error.message } };
    }
    console.error('[project.create] failed', error);
    return { error: '現場の作成に失敗しました。時間をおいて再度お試しください。' };
  }

  revalidatePath('/projects');
  revalidatePath('/dashboard');
  redirect(`/projects/${projectId}`);
}

export async function deleteProjectAction(formData: FormData): Promise<void> {
  const { user, organization, capabilities } = await requireSession();
  assertCan(capabilities, 'project.delete');

  const projectId = String(formData.get('projectId') ?? '');
  if (!projectId) return;

  const removed = await softDeleteProject(organization.id, projectId);
  if (removed) {
    await recordAudit({
      organizationId: organization.id,
      actorId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      action: 'project.delete',
      targetType: 'project',
      targetId: removed.id,
      targetLabel: removed.name,
      projectId: removed.id,
    });
  }

  revalidatePath('/projects');
  revalidatePath('/dashboard');
}
