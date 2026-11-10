/**
 * Idempotent seed for the `sites` RBAC resource introduced with Phase 5.
 * New tenants pick this up via tenant-provision.ts which reads ROLE_DEFINITIONS.
 * Existing tenants in Neon need this script run once to insert the new rows
 * into their per-tenant role tables.
 *
 * Run with:  npx tsx scripts/seed-sites-perms.ts
 */
import { prisma } from '../src/lib/prisma';
import { ROLE_DEFINITIONS } from '../src/lib/rbac-definitions';

async function main(): Promise<void> {
  const roles = await prisma.role.findMany({
    select: { id: true, name: true, tenantId: true },
  });
  console.log(`[seed-sites-perms] ${roles.length} role rows across all tenants`);

  let inserted = 0;
  let skipped = 0;

  for (const role of roles) {
    const def = ROLE_DEFINITIONS.find((r) => r.name === role.name);
    if (!def) {
      console.log(`  skip role.name=${role.name} (no definition)`);
      continue;
    }

    const siteDefs = def.permissions.filter((p) => p.resource === 'sites');
    if (siteDefs.length === 0) continue;

    for (const p of siteDefs) {
      const existing = await prisma.permission.findUnique({
        where: {
          roleId_resource_action: {
            roleId: role.id,
            resource: p.resource,
            action: p.action,
          },
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.permission.create({
        data: {
          roleId: role.id,
          resource: p.resource,
          action: p.action,
          scope: p.scope,
        },
      });
      inserted++;
    }
  }

  console.log(`[seed-sites-perms] done. inserted=${inserted} skipped=${skipped}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
