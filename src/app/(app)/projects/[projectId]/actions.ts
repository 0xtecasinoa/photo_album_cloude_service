'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/session';
import { capabilitiesForProject, getProject } from '@/lib/queries/projects';
import { softDeletePhotos } from '@/lib/queries/photos';
import { recordAudit } from '@/lib/audit';

/** 選択した写真の削除（論理削除）。 */
export async function deletePhotosAction(projectId: string, photoIds: string[]): Promise<number> {
  const { user, organization } = await requireSession();

  // 現場が自組織のものであることを先に確認する。権限だけでは
  // 他組織の現場IDを渡された場合を防げない。
  const project = await getProject(organization.id, projectId);
  if (!project) return 0;

  const capabilities = await capabilitiesForProject(user.id, projectId);
  if (!capabilities.has('photo.delete')) return 0;

  const removed = await softDeletePhotos(projectId, photoIds, user.id);

  if (removed > 0) {
    await recordAudit({
      organizationId: organization.id,
      actorId: user.id,
      actorName: user.name,
      actorEmail: user.email,
      action: 'photo.delete',
      targetType: 'project',
      targetId: projectId,
      targetLabel: project.name,
      projectId,
      metadata: { count: removed, photoIds },
    });
  }

  revalidatePath(`/projects/${projectId}`);
  return removed;
}
