import { prisma } from '../prisma';
import { getPlan } from '../plans';

/**
 * Set a tenant's aiMonthlyBudget to match their current plan's default.
 * Called on tenant provisioning and on Stripe subscription.updated.
 *
 * Does NOT override custom budgets if an admin has explicitly raised or
 * lowered the number (flagged by aiMonthlyBudget being non-default for
 * the prior plan). For now the logic is simple: set to plan default.
 */
export async function syncAiBudgetForTenant(tenantId: string): Promise<number> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true },
  });
  if (!tenant) return 0;

  const plan = getPlan(tenant.plan);
  const next = plan.limits.maxMonthlyAiDrafts;

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { aiMonthlyBudget: next },
  });

  return next;
}

/**
 * Stripe meter event posting. Called from service.ts after a successful
 * draft to increment the tenant's overage counter.
 *
 * Uses Stripe's subscription-item meter events. The meter name must be
 * provisioned in Stripe separately (see README.md).
 *
 * Fails silently -- draft success must not depend on Stripe being reachable.
 */
export async function recordAiMeterEvent(params: {
  tenantId: string;
  feature: string;
  count?: number;
}): Promise<void> {
  const enabled = process.env.STRIPE_AI_METER_ENABLED === 'true';
  if (!enabled) return;

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: params.tenantId },
      select: { stripeCustomerId: true },
    });
    if (!tenant?.stripeCustomerId) return;

    // Lazy import so this module stays usable when Stripe isn't configured.
    const { getStripeClient } = await import('../stripe');
    const stripe = getStripeClient();
    await stripe.billing.meterEvents.create({
      event_name: 'ai_draft_generated',
      payload: {
        stripe_customer_id: tenant.stripeCustomerId,
        value: String(params.count ?? 1),
      },
      identifier: `${params.tenantId}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`,
    });
  } catch (err) {
    console.warn('[ai] meter event failed', err);
  }
}
