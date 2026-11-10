export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireCronAuth } from '@/lib/cron-auth';
import { prisma } from '@/lib/prisma';
import { notifyMany } from '@/lib/notifications';

const RECENT_FIRE_WINDOW_HOURS = 24;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const unauthorized = requireCronAuth(req);
  if (unauthorized) return unauthorized;

  const startedAt = Date.now();
  let rulesEvaluated = 0;
  let fired = 0;

  const rules = await prisma.alertRule.findMany({ where: { enabled: true } });
  const recentCutoff = new Date(Date.now() - RECENT_FIRE_WINDOW_HOURS * 3_600_000);

  for (const rule of rules) {
    rulesEvaluated++;
    if (rule.lastTriggeredAt && rule.lastTriggeredAt > recentCutoff) continue;

    const threshold = Number(rule.thresholdValue);
    let triggered = false;
    let summary = '';

    if (rule.type === 'ar_aging' || rule.type === 'invoice_overdue') {
      // Sum balance of invoices overdue by threshold days
      const days = rule.thresholdUnit === 'days' ? threshold : 30;
      const cutoff = new Date(Date.now() - days * 86_400_000);
      const result = await prisma.qboInvoice.aggregate({
        where: { tenantId: rule.tenantId, dueDate: { lt: cutoff }, balance: { gt: 0 } },
        _sum: { balance: true },
        _count: true,
      });
      const amount = Number(result._sum.balance ?? 0);
      const count = result._count;
      if (rule.type === 'invoice_overdue' ? count > 0 : amount >= threshold) {
        triggered = true;
        summary = `${count} invoice${count === 1 ? '' : 's'} overdue (AR: $${amount.toFixed(2)})`;
      }
    } else if (rule.type === 'revenue_drop') {
      const now = new Date();
      const startCurr = new Date(now.getFullYear(), now.getMonth(), 1);
      const startPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const [curr, prev] = await Promise.all([
        prisma.qboPayment.aggregate({
          where: { tenantId: rule.tenantId, txnDate: { gte: startCurr } },
          _sum: { totalAmt: true },
        }),
        prisma.qboPayment.aggregate({
          where: { tenantId: rule.tenantId, txnDate: { gte: startPrev, lt: startCurr } },
          _sum: { totalAmt: true },
        }),
      ]);
      const currAmt = Number(curr._sum.totalAmt ?? 0);
      const prevAmt = Number(prev._sum.totalAmt ?? 0);
      if (prevAmt > 0) {
        const dropPct = ((prevAmt - currAmt) / prevAmt) * 100;
        if (dropPct >= threshold) {
          triggered = true;
          summary = `Revenue dropped ${dropPct.toFixed(1)}% vs last month ($${currAmt.toFixed(0)} vs $${prevAmt.toFixed(0)})`;
        }
      }
    } else if (rule.type === 'payment_received') {
      // Notify on any payment in last day over threshold
      const cutoff = new Date(Date.now() - 86_400_000);
      const recent = await prisma.qboPayment.findMany({
        where: { tenantId: rule.tenantId, txnDate: { gte: cutoff } },
        take: 10,
      });
      const big = recent.filter((p) => Number(p.totalAmt) >= threshold);
      if (big.length) {
        triggered = true;
        summary = `${big.length} large payment${big.length === 1 ? '' : 's'} received today`;
      }
    }

    if (!triggered) continue;

    const owners = await prisma.tenantUser.findMany({
      where: { tenantId: rule.tenantId, deletedAt: null, role: { name: 'Owner' } },
      select: { userId: true },
    });
    const userIds = owners.map((o) => o.userId);
    if (userIds.length) {
      await notifyMany(rule.tenantId, userIds, {
        type: 'financial_alert',
        title: alertTitle(rule.type),
        body: summary,
        referenceType: 'alert_rule',
        referenceId: rule.id,
      });
    }

    await prisma.alertRule.update({ where: { id: rule.id }, data: { lastTriggeredAt: new Date() } });
    fired++;
  }

  return NextResponse.json({
    ok: true,
    job: 'financial-alerts',
    rulesEvaluated,
    fired,
    durationMs: Date.now() - startedAt,
    ts: startedAt,
  });
}

function alertTitle(type: string): string {
  switch (type) {
    case 'revenue_drop': return 'Revenue drop detected';
    case 'ar_aging': return 'AR aging threshold crossed';
    case 'invoice_overdue': return 'Invoices are overdue';
    case 'payment_received': return 'Large payment received';
    default: return 'Financial alert';
  }
}
