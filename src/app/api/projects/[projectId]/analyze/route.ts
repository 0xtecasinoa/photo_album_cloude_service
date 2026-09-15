import { NextResponse } from 'next/server';
import { getSessionContext } from '@/lib/auth/session';
import { capabilitiesForProject, getProject } from '@/lib/queries/projects';
import { analyzeProjectPhotos } from '@/lib/blackboard/analyze-photo';
import { recordAudit, auditRequestInfo } from '@/lib/audit';

export const runtime = 'nodejs';
/** 1枚あたり1.5秒ほど。50枚で75秒かかる想定。 */
export const maxDuration = 300;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;

  const ctx = await getSessionContext();
  if (!ctx) return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 });

  // 現場が自組織のものかを先に確かめる。権限は現場単位で決まるため。
  const project = await getProject(ctx.organization.id, projectId);
  if (!project) return NextResponse.json({ error: '現場が見つかりません。' }, { status: 404 });

  const capabilities = await capabilitiesForProject(ctx.user.id, projectId);
  if (!capabilities.has('photo.edit')) {
    return NextResponse.json({ error: '写真を編集する権限がありません。' }, { status: 403 });
  }

  const result = await analyzeProjectPhotos(projectId, { limit: 50 });

  await recordAudit({
    organizationId: ctx.organization.id,
    actorId: ctx.user.id,
    actorName: ctx.user.name,
    actorEmail: ctx.user.email,
    action: 'photo.update',
    targetType: 'project',
    targetId: projectId,
    targetLabel: project.name,
    projectId,
    metadata: { change: 'ocr_analyze', ...result },
    ...auditRequestInfo(request),
  });

  return NextResponse.json(result);
}
