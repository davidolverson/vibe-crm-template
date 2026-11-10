import { prisma } from './prisma';
import { DEFAULT_ALERT_RULES } from './alerts-meta';

export * from './alerts-meta';

/**
 * Idempotently seed the default alert rules for a tenant. Safe to call on
 * every /settings/alerts page load -- inserts only the rule types that the
 * tenant does not already have.
 */
export async function ensureDefaultAlertRules(tenantId: string): Promise<number> {
  const existing = await prisma.alertRule.findMany({
    where: { tenantId },
    select: { type: true },
  });
  const have = new Set(existing.map((r) => r.type));
  const missing = DEFAULT_ALERT_RULES.filter((r) => !have.has(r.type));
  if (missing.length === 0) return 0;

  await prisma.alertRule.createMany({
    data: missing.map((r) => ({
      tenantId,
      type: r.type,
      thresholdValue: r.thresholdValue,
      thresholdUnit: r.thresholdUnit,
      enabled: true,
    })),
  });
  return missing.length;
}
