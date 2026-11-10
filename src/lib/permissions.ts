import { getAuthContext, AuthError, type AuthContext } from './auth';
import { prisma } from './prisma';
import { withTenantContext } from './tenant-context';

export interface PermissionResult extends AuthContext {
  scope: 'all' | 'assigned';
}

/**
 * Check if the current user has a specific permission.
 * Throws 403 if not authorized.
 *
 * Usage:
 *   const { userId, tenantId, scope } = await requirePermission('contacts.view');
 *   // scope = 'all' | 'assigned' -- use to filter queries
 */
export async function requirePermission(
  permissionKey: string
): Promise<PermissionResult> {
  const ctx = await getAuthContext();

  const [resource, action] = permissionKey.split('.');

  if (!resource || !action) {
    throw new Error(`Invalid permission key: ${permissionKey}`);
  }

  const permission = await prisma.permission.findUnique({
    where: {
      roleId_resource_action: {
        roleId: ctx.roleId,
        resource,
        action,
      },
    },
  });

  if (!permission) {
    throw new AuthError(`Forbidden: missing permission ${permissionKey}`, 403);
  }

  return {
    ...ctx,
    scope: permission.scope as 'all' | 'assigned',
  };
}

/**
 * Check permission and set up tenant context for the operation.
 * Combines requirePermission + withTenantContext.
 */
export async function withPermission<T>(
  permissionKey: string,
  fn: (ctx: PermissionResult) => Promise<T>
): Promise<T> {
  const result = await requirePermission(permissionKey);
  return withTenantContext(result.tenantId, result.userId, () => fn(result));
}
