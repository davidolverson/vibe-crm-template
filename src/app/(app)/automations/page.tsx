import { withPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { AutomationsClient } from './automations-client';

export const metadata = { title: 'Automations | VIBE' };

export default async function AutomationsPage() {
  const data = await withPermission('automations.view', async (ctx) => {
    const [automations, sequences, canEdit] = await Promise.all([
      prisma.automation.findMany({
        where: { tenantId: ctx.tenantId },
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { logs: true } } },
      }),
      prisma.sequence.findMany({
        where: { tenantId: ctx.tenantId, status: 'active' },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.permission.findUnique({
        where: {
          roleId_resource_action: {
            roleId: ctx.roleId,
            resource: 'automations',
            action: 'create',
          },
        },
      }),
    ]);

    return {
      automations: automations.map((a) => ({
        id: a.id,
        name: a.name,
        triggerType: a.triggerType,
        enabled: a.enabled,
        fireCount: a._count.logs,
        createdAt: a.createdAt.toISOString(),
        conditions: a.conditionsJson,
        actions: a.actionsJson,
      })),
      sequences,
      canEdit: !!canEdit,
    };
  });

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Automations</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Trigger + condition + action rules. The <code className="rounded bg-zinc-900 px-1 py-0.5 text-xs">lead-alerts</code> cron evaluates lead_not_contacted rules daily.
        </p>
      </div>
      <AutomationsClient
        automations={data.automations}
        sequences={data.sequences}
        canEdit={data.canEdit}
      />
    </div>
  );
}
