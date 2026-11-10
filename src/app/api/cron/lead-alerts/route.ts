export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireCronAuth } from '@/lib/cron-auth';
import { prisma } from '@/lib/prisma';
import { notifyMany } from '@/lib/notifications';

// Default staleness window if an automation doesn't specify one.
const DEFAULT_WINDOW_MINUTES = 15;

interface LeadAlertConditions {
  windowMinutes?: number;
}

interface LeadAlertActions {
  notify_owner?: boolean;
  notify_role?: 'Owner' | 'Admin' | 'Producer';
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const unauthorized = requireCronAuth(req);
  if (unauthorized) return unauthorized;

  const startedAt = Date.now();
  let rulesEvaluated = 0;
  let alerted = 0;

  const automations = await prisma.automation.findMany({
    where: { triggerType: 'lead_not_contacted', enabled: true },
  });

  for (const auto of automations) {
    rulesEvaluated++;
    const conditions = (auto.conditionsJson ?? {}) as LeadAlertConditions;
    const actions = (auto.actionsJson ?? {}) as LeadAlertActions;
    const windowMin = conditions.windowMinutes ?? DEFAULT_WINDOW_MINUTES;
    const cutoff = new Date(Date.now() - windowMin * 60_000);

    const candidateLeads = await prisma.contact.findMany({
      where: {
        tenantId: auto.tenantId,
        deletedAt: null,
        firstContactedAt: null,
        leadCreatedAt: { lt: cutoff },
      },
      select: { id: true, name: true, assignedToUserId: true },
      take: 500,
    });

    if (candidateLeads.length === 0) continue;

    // Idempotency: skip leads that already fired this automation in the last 24h.
    const cooldownCutoff = new Date(Date.now() - 24 * 3600_000);
    const recentFires = await prisma.automationLog.findMany({
      where: {
        automationId: auto.id,
        contactId: { in: candidateLeads.map((l) => l.id) },
        triggeredAt: { gte: cooldownCutoff },
      },
      select: { contactId: true },
    });
    const suppressed = new Set(recentFires.map((r) => r.contactId));
    const staleLeads = candidateLeads.filter((l) => !suppressed.has(l.id)).slice(0, 100);

    if (staleLeads.length === 0) continue;

    // Determine recipients
    let recipientUserIds: string[] = [];
    if (actions.notify_owner) {
      const owners = await prisma.tenantUser.findMany({
        where: { tenantId: auto.tenantId, deletedAt: null, role: { name: 'Owner' } },
        select: { userId: true },
      });
      recipientUserIds = owners.map((o) => o.userId);
    } else if (actions.notify_role) {
      const roleMembers = await prisma.tenantUser.findMany({
        where: { tenantId: auto.tenantId, deletedAt: null, role: { name: actions.notify_role } },
        select: { userId: true },
      });
      recipientUserIds = roleMembers.map((o) => o.userId);
    } else {
      // Default: notify the assigned agent per lead
      const assigned = staleLeads.map((l) => l.assignedToUserId).filter(Boolean) as string[];
      recipientUserIds = [...new Set(assigned)];
    }

    if (recipientUserIds.length === 0) continue;

    await notifyMany(auto.tenantId, recipientUserIds, {
      type: 'automation_fired',
      title: `${staleLeads.length} stale lead${staleLeads.length === 1 ? '' : 's'}`,
      body: `Leads with no contact activity in ${windowMin} minutes`,
      referenceType: 'automation',
      referenceId: auto.id,
    });

    await prisma.automationLog.createMany({
      data: staleLeads.map((lead) => ({
        automationId: auto.id,
        contactId: lead.id,
        result: 'success',
      })),
      skipDuplicates: true,
    }).catch(() => {});

    alerted += staleLeads.length;
  }

  return NextResponse.json({
    ok: true,
    job: 'lead-alerts',
    rulesEvaluated,
    alerted,
    durationMs: Date.now() - startedAt,
    ts: startedAt,
  });
}
