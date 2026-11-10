import { prisma } from './prisma';
import { getPlan, getPlanLimits, PLAN_ORDER, type PlanLimits } from './plans';

export type LimitResource = 'contacts' | 'users' | 'sequences' | 'sites' | 'forms';

interface LimitCheck {
  allowed: boolean;
  current: number;
  max: number;
  resource: LimitResource;
}

const RESOURCE_TO_LIMIT: Record<LimitResource, keyof PlanLimits> = {
  contacts: 'maxContacts',
  users: 'maxUsers',
  sequences: 'maxSequences',
  sites: 'maxSites',
  forms: 'maxSequences', // forms share the maxSequences cap
};

/** The subscription fields resolveEffectivePlan() reasons about. */
export interface PlanSubscriptionState {
  plan: string;
  subscriptionStatus: string | null;
  trialEndsAt: Date | null;
}

/**
 * Pure decision: given a tenant's subscription fields and the current time,
 * return the effective plan id. Extracted from getEffectivePlan so the
 * trial-expiry rules are unit-testable without a database.
 *
 * - active                       -> the tenant's plan
 * - trialing + trial not expired -> the tenant's plan
 * - trialing + trial expired     -> free
 * - past_due/canceled/unpaid/etc -> free
 * - no tenant                    -> free
 */
export function resolveEffectivePlan(
  sub: PlanSubscriptionState | null,
  now: Date = new Date()
): string {
  if (!sub) return 'free';
  if (sub.subscriptionStatus === 'active') return sub.plan;
  if (sub.subscriptionStatus === 'trialing') {
    return sub.trialEndsAt && sub.trialEndsAt > now ? sub.plan : 'free';
  }
  return 'free';
}

/**
 * Resolve the effective plan for a tenant, accounting for trial expiry.
 * If trial has expired and subscription is not active, fall back to "free".
 */
export async function getEffectivePlan(tenantId: string): Promise<string> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true, subscriptionStatus: true, trialEndsAt: true },
  });

  return resolveEffectivePlan(tenant);
}

/**
 * Check whether a tenant can create another resource under their plan.
 * Returns { allowed, current, max } so callers can show a helpful message.
 * Accounts for trial expiry -- expired trials enforce free-tier limits.
 */
export async function checkPlanLimit(
  tenantId: string,
  resource: LimitResource
): Promise<LimitCheck> {
  const effectivePlan = await getEffectivePlan(tenantId);
  const limits = getPlanLimits(effectivePlan);
  const max = limits[RESOURCE_TO_LIMIT[resource]];
  const current = await countResource(tenantId, resource);

  return { allowed: current < max, current, max, resource };
}

/**
 * Assert the limit -- throws a structured error if exceeded.
 * Use in server actions before creating a resource.
 */
export async function enforcePlanLimit(
  tenantId: string,
  resource: LimitResource
): Promise<void> {
  const check = await checkPlanLimit(tenantId, resource);
  if (!check.allowed) {
    throw new PlanLimitError(check);
  }
}

export class PlanLimitError extends Error {
  public readonly current: number;
  public readonly max: number;
  public readonly resource: LimitResource;

  constructor(check: LimitCheck) {
    super(
      `Plan limit reached: ${check.current}/${check.max} ${check.resource}. Upgrade your plan for more.`
    );
    this.name = 'PlanLimitError';
    this.current = check.current;
    this.max = check.max;
    this.resource = check.resource;
  }
}

/**
 * Determine the display name of the next plan above the current one, for use
 * in upgrade prompts shown to users.
 */
function nextPlanName(effectivePlan: string): string {
  const idx = PLAN_ORDER.indexOf(effectivePlan as (typeof PLAN_ORDER)[number]);
  if (idx === -1 || idx >= PLAN_ORDER.length - 1) return 'a higher tier';
  const nextId = PLAN_ORDER[idx + 1];
  return getPlan(nextId).name;
}

/**
 * Soft limit check -- returns a user-facing error string when the limit is
 * exceeded, or null when the action is allowed.
 *
 * Use this in server actions instead of enforcePlanLimit so the action can
 * return { success: false, error } without throwing.
 *
 * @param tenantId   - The tenant performing the action
 * @param resource   - The resource being created
 * @param adding     - How many records are being added (default 1)
 */
export async function checkPlanLimitSoft(
  tenantId: string,
  resource: LimitResource,
  adding = 1
): Promise<string | null> {
  const effectivePlan = await getEffectivePlan(tenantId);
  const limits = getPlanLimits(effectivePlan);
  const max = limits[RESOURCE_TO_LIMIT[resource]];
  const current = await countResource(tenantId, resource);

  if (current + adding > max) {
    const label = RESOURCE_LABELS[resource];
    const next = nextPlanName(effectivePlan);
    // Show "at limit" phrasing when exactly full, "would exceed" when adding > 1
    if (adding === 1) {
      return `${label} limit reached (${current}/${max}). Upgrade to ${next} for more.`;
    }
    const remaining = Math.max(0, max - current);
    return `${label} limit would be exceeded. You can import at most ${remaining} more (${current}/${max}). Upgrade to ${next} for more.`;
  }

  return null;
}

const RESOURCE_LABELS: Record<LimitResource, string> = {
  contacts: 'Contact',
  users: 'User',
  sequences: 'Sequence',
  sites: 'Site',
  forms: 'Form',
};

async function countResource(
  tenantId: string,
  resource: LimitResource
): Promise<number> {
  switch (resource) {
    case 'contacts':
      return prisma.contact.count({
        where: { tenantId, deletedAt: null },
      });
    case 'users':
      return prisma.tenantUser.count({
        where: { tenantId, deletedAt: null },
      });
    case 'sequences':
      return prisma.sequence.count({
        where: { tenantId },
      });
    case 'sites':
      return prisma.site.count({
        where: { tenantId },
      });
    case 'forms':
      return prisma.form.count({
        where: { tenantId },
      });
  }
}
