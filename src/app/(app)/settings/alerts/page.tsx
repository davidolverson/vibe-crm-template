import { withPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { ensureDefaultAlertRules } from '@/lib/alerts';
import { AlertsClient, type AlertRuleRow } from './alerts-client';

export const metadata = { title: 'Financial alerts | VIBE' };

export default async function AlertsSettingsPage() {
  const data = await withPermission('settings.view', async (ctx) => {
    await ensureDefaultAlertRules(ctx.tenantId);

    const [rules, canEditPerm, qbo] = await Promise.all([
      prisma.alertRule.findMany({
        where: { tenantId: ctx.tenantId },
        orderBy: { type: 'asc' },
      }),
      prisma.permission.findUnique({
        where: {
          roleId_resource_action: {
            roleId: ctx.roleId,
            resource: 'settings',
            action: 'edit',
          },
        },
      }),
      prisma.qboConnection.findUnique({
        where: { tenantId: ctx.tenantId },
        select: { syncStatus: true },
      }),
    ]);

    const rows: AlertRuleRow[] = rules.map((r) => ({
      id: r.id,
      type: r.type,
      enabled: r.enabled,
      thresholdValue: Number(r.thresholdValue),
      thresholdUnit: r.thresholdUnit as 'percent' | 'days' | 'amount',
      lastTriggeredAt: r.lastTriggeredAt?.toISOString() ?? null,
    }));

    return { rules: rows, canEdit: !!canEditPerm, qboConnected: !!qbo };
  });

  return (
    <AlertsClient
      rules={data.rules}
      canEdit={data.canEdit}
      qboConnected={data.qboConnected}
    />
  );
}
