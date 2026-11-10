import { headers } from 'next/headers';
import { auth } from './auth-server';
import { prisma } from './prisma';
import { withTenantContext } from './tenant-context';

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

export interface AuthContext {
  userId: string;
  tenantId: string;
  organizationId: string;
  roleId: string;
  roleName: string;
  user: {
    name: string;
    email: string;
    image: string | null;
  };
}

/**
 * Get the current authenticated user's context including tenant info.
 * Throws AuthError with proper HTTP status codes.
 */
export async function getAuthContext(): Promise<AuthContext> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new AuthError('Not authenticated', 401);
  }

  const userId = session.user.id;

  // Get the user's active organization
  const activeOrgId = session.session.activeOrganizationId;
  if (!activeOrgId) {
    throw new AuthError('No active organization selected', 403);
  }

  // Single query: tenant + user membership + role + permissions
  const tenant = await prisma.tenant.findUnique({
    where: { organizationId: activeOrgId },
    include: {
      users: {
        where: { userId, deletedAt: null },
        include: {
          role: {
            include: { permissions: true },
          },
        },
        take: 1,
      },
    },
  });

  if (!tenant) {
    throw new AuthError('Tenant not found', 403);
  }

  const tenantUser = tenant.users[0];
  if (!tenantUser) {
    throw new AuthError('Access denied', 403);
  }

  return {
    userId,
    tenantId: tenant.id,
    organizationId: activeOrgId,
    roleId: tenantUser.roleId,
    roleName: tenantUser.role.name,
    user: {
      name: session.user.name || 'User',
      email: session.user.email || '',
      image: session.user.image || null,
    },
  };
}

/**
 * Run a function within the tenant context of the current authenticated user.
 */
export async function withAuth<T>(fn: (ctx: AuthContext) => Promise<T>): Promise<T> {
  const ctx = await getAuthContext();
  return withTenantContext(ctx.tenantId, ctx.userId, () => fn(ctx));
}
