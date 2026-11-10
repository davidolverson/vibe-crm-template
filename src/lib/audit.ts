import { prisma } from './prisma';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'login'
  | 'export'
  | 'import';

/**
 * Write an audit log entry (original helper, kept for backwards compat).
 * Called from server actions after key operations.
 */
export async function auditLog(params: {
  tenantId: string;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId ?? null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? null,
        metadata: (params.metadata ?? undefined) as Parameters<typeof prisma.auditLog.create>[0]['data']['metadata'],
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

/**
 * Typed audit log helper for use inside server actions.
 *
 * Designed to be fire-and-forget -- does not throw.
 * If the write fails we log to stderr but never surface it to the caller.
 *
 * @param tenantId   - Workspace ID (always required)
 * @param userId     - User who performed the action (null for system actions)
 * @param action     - One of the allowed AuditAction literals
 * @param entityType - The model/resource name, e.g. "contact", "deal", "stage"
 * @param entityId   - ID of the affected record (optional)
 * @param details    - Arbitrary structured data to persist as metadata
 */
export async function logAudit(
  tenantId: string,
  userId: string | null,
  action: AuditAction,
  entityType: string,
  entityId?: string | null,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: userId ?? null,
        action,
        entity: entityType,
        entityId: entityId ?? null,
        metadata: (details ?? undefined) as Parameters<typeof prisma.auditLog.create>[0]['data']['metadata'],
      },
    });
  } catch (err) {
    // Never throw -- audit failures should not block the primary operation
    console.error('[audit] Failed to write audit log:', err);
  }
}
