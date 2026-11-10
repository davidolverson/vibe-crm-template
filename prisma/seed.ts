/**
 * prisma/seed.ts
 *
 * Seeds the three default RBAC roles (Owner, Admin, Producer) and their
 * permission sets for a given tenant.
 *
 * Run standalone:
 *   npx tsx prisma/seed.ts [tenantId]
 *
 * Reusable from provisioning code:
 *   import { seedRolesForTenant } from './prisma/seed'
 *   await seedRolesForTenant(prisma, tenantId)
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  ROLE_DEFINITIONS,
  DEFAULT_PIPELINE_STAGES,
  DEFAULT_FORM_FIELDS,
} from '../src/lib/rbac-definitions';

/**
 * Idempotently seeds the three default roles and their permissions for the
 * given tenant. Uses upsert throughout — safe to call multiple times.
 */
export async function seedRolesForTenant(
  prisma: PrismaClient,
  tenantId: string
): Promise<Array<{ id: string; name: string; permissionCount: number }>> {
  console.log(`\n[seed] Seeding roles for tenant: ${tenantId}`);

  const results: Array<{ id: string; name: string; permissionCount: number }> = [];

  for (const roleDef of ROLE_DEFINITIONS) {
    const role = await prisma.role.upsert({
      where: {
        tenantId_name: {
          tenantId,
          name: roleDef.name,
        },
      },
      create: {
        tenantId,
        name: roleDef.name,
      },
      update: {},
    });

    console.log(`  [role] "${role.name}" (${role.id}) — upserted`);

    let permCount = 0;
    for (const perm of roleDef.permissions) {
      await prisma.permission.upsert({
        where: {
          roleId_resource_action: {
            roleId: role.id,
            resource: perm.resource,
            action: perm.action,
          },
        },
        create: {
          roleId: role.id,
          resource: perm.resource,
          action: perm.action,
          scope: perm.scope,
        },
        update: {
          scope: perm.scope,
        },
      });
      permCount++;
    }

    results.push({ id: role.id, name: role.name, permissionCount: permCount });
  }

  console.log(`\n[seed] Done. ${results.length} roles seeded for tenant ${tenantId}.`);
  return results;
}

/**
 * Seeds the default pipeline (8 stages), assignment rules, and lead capture form.
 * Idempotent — skips creation if data already exists.
 */
export async function seedTenantDefaults(
  prisma: PrismaClient,
  tenantId: string,
  ownerUserId?: string
): Promise<void> {
  console.log(`\n[seed] Seeding tenant defaults for: ${tenantId}`);

  // --- Pipeline ---
  const existingPipeline = await prisma.pipeline.findFirst({ where: { tenantId } });
  if (!existingPipeline) {
    const pipeline = await prisma.pipeline.create({
      data: {
        tenantId,
        name: 'Real Estate',
        isDefault: true,
        stages: {
          create: DEFAULT_PIPELINE_STAGES.map((s) => ({
            tenantId,
            name: s.name,
            position: s.position,
          })),
        },
      },
    });
    console.log(`  [pipeline] Created "${pipeline.name}" with ${DEFAULT_PIPELINE_STAGES.length} stages`);
  } else {
    // Update existing pipeline stages to match spec
    const stages = await prisma.pipelineStage.findMany({
      where: { pipelineId: existingPipeline.id },
      orderBy: { position: 'asc' },
    });

    if (stages.length !== DEFAULT_PIPELINE_STAGES.length) {
      // Delete old stages and recreate
      await prisma.pipelineStage.deleteMany({ where: { pipelineId: existingPipeline.id } });
      for (const s of DEFAULT_PIPELINE_STAGES) {
        await prisma.pipelineStage.create({
          data: { tenantId, pipelineId: existingPipeline.id, name: s.name, position: s.position },
        });
      }
      console.log(`  [pipeline] Updated to ${DEFAULT_PIPELINE_STAGES.length} stages`);
    } else {
      console.log(`  [pipeline] Already has ${stages.length} stages — skipped`);
    }
  }

  // --- Assignment Rules ---
  const ruleCount = await prisma.assignmentRule.count({ where: { tenantId } });
  if (ruleCount === 0) {
    await prisma.assignmentRule.create({
      data: {
        tenantId,
        type: 'round_robin',
        configJson: { agent_user_ids: [] },
        lastAssignedIndex: 0,
      },
    });
    await prisma.assignmentRule.create({
      data: {
        tenantId,
        type: 'default_owner',
        configJson: { owner_user_id: ownerUserId ?? '' },
      },
    });
    console.log('  [rules] Created round_robin + default_owner');
  } else {
    console.log(`  [rules] ${ruleCount} rules already exist — skipped`);
  }

  // --- Default Form ---
  const formCount = await prisma.form.count({ where: { tenantId } });
  if (formCount === 0) {
    const form = await prisma.form.create({
      data: {
        tenantId,
        name: 'Website Lead Capture',
        active: true,
        fields: {
          create: DEFAULT_FORM_FIELDS.map((f) => ({
            tenantId,
            label: f.label,
            type: f.type,
            required: f.required,
            position: f.position,
          })),
        },
      },
    });
    console.log(`  [form] Created "${form.name}" with ${DEFAULT_FORM_FIELDS.length} fields`);
  } else {
    console.log(`  [form] ${formCount} form(s) already exist — skipped`);
  }
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('[seed] DATABASE_URL is not set');
    process.exit(1);
  }

  const tenantIdArg = process.argv[2];
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    if (tenantIdArg) {
      await seedRolesForTenant(prisma, tenantIdArg);
      const ownerUser = await prisma.tenantUser.findFirst({ where: { tenantId: tenantIdArg } });
      await seedTenantDefaults(prisma, tenantIdArg, ownerUser?.userId);
    } else {
      const tenants = await prisma.tenant.findMany({
        select: { id: true, name: true, slug: true },
      });

      if (tenants.length === 0) {
        console.warn('[seed] No tenants found. Pass a tenantId as argument or create a tenant first.');
        return;
      }

      console.log(`[seed] Seeding ${tenants.length} tenant(s).`);
      for (const tenant of tenants) {
        console.log(`\n[seed] Tenant: "${tenant.name}" (${tenant.slug})`);
        const roles = await seedRolesForTenant(prisma, tenant.id);
        // Link existing tenantUser to proper Owner role if needed
        const ownerRole = roles.find((r) => r.name === 'Owner');
        if (ownerRole) {
          const tenantUsers = await prisma.tenantUser.findMany({ where: { tenantId: tenant.id } });
          for (const tu of tenantUsers) {
            if (tu.roleId !== ownerRole.id) {
              await prisma.tenantUser.update({
                where: { id: tu.id },
                data: { roleId: ownerRole.id },
              });
              console.log(`  [user] Linked ${tu.userId} to Owner role`);
            }
          }
        }
        const ownerUser = await prisma.tenantUser.findFirst({ where: { tenantId: tenant.id } });
        await seedTenantDefaults(prisma, tenant.id, ownerUser?.userId);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

const isEntrypoint =
  typeof process !== 'undefined' &&
  process.argv[1] !== undefined &&
  (process.argv[1].endsWith('seed.ts') || process.argv[1].endsWith('seed.js'));

if (isEntrypoint) {
  main().catch((err: unknown) => {
    console.error('[seed] Fatal error:', err);
    process.exit(1);
  });
}
