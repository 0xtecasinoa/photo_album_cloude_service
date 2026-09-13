import { db } from '@/db';
import { auditLogs } from '@/db/schema';

export type AuditAction =
  | 'auth.login'
  | 'auth.login_failed'
  | 'auth.logout'
  | 'project.create' | 'project.update' | 'project.delete' | 'project.archive'
  | 'photo.upload' | 'photo.update' | 'photo.delete' | 'photo.restore' | 'photo.download'
  | 'album.create' | 'album.update' | 'album.delete'
  | 'blackboard.template.create' | 'blackboard.template.update' | 'blackboard.template.delete'
  | 'blackboard.import'
  | 'export.excel' | 'export.pdf' | 'export.denshi_nouhin'
  | 'member.invite' | 'member.role_changed' | 'member.remove'
  | 'role.create' | 'role.update' | 'role.delete'
  | 'share.create' | 'share.revoke' | 'share.accessed'
  | 'org.settings_changed';

export type AuditEntry = {
  organizationId: string;
  actorId?: string | null;
  actorEmail?: string | null;
  actorName?: string | null;
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  targetLabel?: string;
  projectId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
};

/**
 * Write one audit row.
 *
 * Deliberately swallows its own errors: an audit write must never be the reason a
 * user's upload fails. Failures are logged for the operator instead.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      organizationId: entry.organizationId,
      actorId: entry.actorId ?? null,
      actorEmail: entry.actorEmail ?? null,
      actorName: entry.actorName ?? null,
      action: entry.action,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId ?? null,
      targetLabel: entry.targetLabel ?? null,
      projectId: entry.projectId ?? null,
      metadata: entry.metadata ?? null,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
    });
  } catch (error) {
    console.error('[audit] failed to record entry', { action: entry.action, error });
  }
}

/** Extracts client IP and UA from a request for audit rows. */
export function auditRequestInfo(req: Request): { ipAddress: string | null; userAgent: string | null } {
  const forwarded = req.headers.get('x-forwarded-for');
  return {
    ipAddress: forwarded ? forwarded.split(',')[0]!.trim() : req.headers.get('x-real-ip'),
    userAgent: req.headers.get('user-agent'),
  };
}
