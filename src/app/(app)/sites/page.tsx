import { withPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { listSites } from '@/lib/sites';
import { checkPlanLimit } from '@/lib/plan-enforcement';
import { SitesClient } from './sites-client';

export const metadata = { title: 'Sites | VIBE' };

export default async function SitesPage() {
  const data = await withPermission('sites.view', async (ctx) => {
    const [sites, canCreatePerm, limit] = await Promise.all([
      listSites(ctx.tenantId),
      prisma.permission.findUnique({
        where: {
          roleId_resource_action: {
            roleId: ctx.roleId,
            resource: 'sites',
            action: 'create',
          },
        },
      }),
      checkPlanLimit(ctx.tenantId, 'sites'),
    ]);

    return {
      sites,
      canCreate: !!canCreatePerm && limit.allowed,
      limit,
    };
  });

  return <SitesClient sites={data.sites} canCreate={data.canCreate} limit={data.limit} />;
}
