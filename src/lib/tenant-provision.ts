import { type Tenant, PrismaClient } from '../generated/prisma/client';
import { prisma } from './prisma';
import { ROLE_DEFINITIONS, DEFAULT_PIPELINE_STAGES } from './rbac-definitions';
import { getPlan } from './plans';

/**
 * Seeds Owner / Admin / Producer roles with their full permission sets
 * inside an existing transaction. Returns a map of role name → role id.
 */
async function seedRolesForTenant(
  tx: Parameters<Parameters<PrismaClient['$transaction']>[0]>[0],
  tenantId: string,
): Promise<Record<string, string>> {
  const roleIdMap: Record<string, string> = {};

  for (const roleDef of ROLE_DEFINITIONS) {
    const role = await tx.role.create({
      data: {
        tenantId,
        name: roleDef.name,
        permissions: {
          create: roleDef.permissions.map((p) => ({
            resource: p.resource,
            action: p.action,
            scope: p.scope,
          })),
        },
      },
    });
    roleIdMap[roleDef.name] = role.id;
  }

  return roleIdMap;
}

/**
 * Called when a new Better Auth organization is created.
 *
 * Atomically:
 *  1. Creates the Tenant row
 *  2. Seeds Owner / Admin / Producer roles + permissions
 *  3. Creates the default "Real Estate" pipeline with 7 stages
 *  4. Creates the TenantUser record for the creating user with the Owner role
 *
 * Idempotent: returns the existing tenant if already provisioned.
 */
export async function provisionTenant(params: {
  organizationId: string;
  name: string;
  createdByUserId: string;
}): Promise<Tenant> {
  const { organizationId, name, createdByUserId } = params;

  // Idempotency guard -- if tenant already exists, return it
  const existing = await prisma.tenant.findUnique({
    where: { organizationId },
  });
  if (existing) return existing;

  const baseSlug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || organizationId;

  const slug = await resolveUniqueSlug(baseSlug);

  const tenant = await prisma.$transaction(async (tx) => {
    const freePlan = getPlan('free');
    const newTenant = await tx.tenant.create({
      data: {
        organizationId,
        name,
        slug,
        plan: 'free',
        aiMonthlyBudget: freePlan.limits.maxMonthlyAiDrafts,
      },
    });

    const roleIdMap = await seedRolesForTenant(tx, newTenant.id);

    await tx.pipeline.create({
      data: {
        tenantId: newTenant.id,
        name: 'Real Estate',
        isDefault: true,
        stages: {
          create: DEFAULT_PIPELINE_STAGES.map((s) => ({
            tenantId: newTenant.id,
            name: s.name,
            position: s.position,
          })),
        },
      },
    });

    await tx.tenantUser.create({
      data: {
        tenantId: newTenant.id,
        userId: createdByUserId,
        roleId: roleIdMap['Owner'],
      },
    });

    return newTenant;
  });

  return tenant;
}

async function resolveUniqueSlug(base: string): Promise<string> {
  const candidate = await prisma.tenant.findFirst({
    where: { slug: base },
    select: { id: true },
  });

  if (!candidate) return base;

  const suffix = crypto.randomUUID().slice(0, 8);
  return `${base}-${suffix}`;
}
