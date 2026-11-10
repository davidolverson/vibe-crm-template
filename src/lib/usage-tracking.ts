import { prisma } from './prisma';
import { getPlanLimits } from './plans';
import { getEffectivePlan } from './plan-enforcement';

type UsageMetric = 'monthly_emails' | 'monthly_sms';

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Increment a usage counter for the current month.
 * Uses upsert to create the counter row if it doesn't exist yet.
 */
export async function incrementUsage(
  tenantId: string,
  metric: UsageMetric,
  amount = 1
): Promise<void> {
  const period = currentPeriod();

  await prisma.usageCounter.upsert({
    where: {
      tenantId_metric_period: { tenantId, metric, period },
    },
    create: { tenantId, metric, period, count: amount },
    update: { count: { increment: amount } },
  });
}

/**
 * Check whether a tenant can send more emails/SMS this month.
 */
export async function checkUsageLimit(
  tenantId: string,
  metric: UsageMetric
): Promise<{ allowed: boolean; current: number; max: number }> {
  const effectivePlan = await getEffectivePlan(tenantId);
  const limits = getPlanLimits(effectivePlan);
  const max = metric === 'monthly_emails'
    ? limits.maxMonthlyEmails
    : limits.maxMonthlyMessages;

  const period = currentPeriod();
  const counter = await prisma.usageCounter.findUnique({
    where: {
      tenantId_metric_period: { tenantId, metric, period },
    },
    select: { count: true },
  });

  const current = counter?.count ?? 0;
  return { allowed: current < max, current, max };
}
