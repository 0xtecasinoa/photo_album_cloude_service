'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/session';
import { capabilitiesForProject, getProject } from '@/lib/queries/projects';
import { updatePhotoTags } from '@/lib/queries/photos';
import { recordAudit } from '@/lib/audit';

export type TagActionState = { error?: string; message?: string };

export async function updateTagsAction(
  projectId: string,
  photoIds: string[],
  add: string[],
  remove: string[],
): Promise<TagActionState> {
  const { user, organization } = await requireSession();

  // 現場が自組織のものかを先に確かめる。権限は現場単位で決まるため。
  const project = await getProject(organization.id, projectId);
  if (!project) return { error: '現場が見つかりません。' };

  const capabilities = await capabilitiesForProject(user.id, projectId);
  if (!capabilities.has('photo.edit')) {
    return { error: '写真を編集する権限がありません。' };
  }

  const changed = await updatePhotoTags(projectId, photoIds, add, remove);

  await recordAudit({
    organizationId: organization.id,
    actorId: user.id,
    actorName: user.name,
    actorEmail: user.email,
    action: 'photo.update',
    targetType: 'photo',
    targetLabel: `${changed} 枚のタグ`,
    projectId,
    metadata: { add, remove, count: changed },
  });

  revalidatePath(`/projects/${projectId}`);
  return { message: `${changed} 枚のタグを更新しました。` };
}
