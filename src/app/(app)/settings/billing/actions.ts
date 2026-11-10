'use server';

import Stripe from 'stripe';
import { redirect } from 'next/navigation';
import { withPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { getTenantDb } from '@/lib/prisma-tenant';
import { getPlan, PLAN_ORDER } from '@/lib/plans';
import { getEffectivePlan } from '@/lib/plan-enforcement';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface UsageStats {
  contacts: { current: number; max: number };
  users: { current: number; max: number };
  sequences: { current: number; max: number };
  sites: { current: number; max: number };
}

export interface BillingData {
  tenantId: string;
  plan: string;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  usage: UsageStats;
  canEdit: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStripeClientSafe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  // Instantiating requires the key (guarded above); importing the class is safe.
  return new Stripe(key);
}

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
}

// ---------------------------------------------------------------------------
// getCurrentUsage
// ---------------------------------------------------------------------------

export async function getCurrentUsage(): Promise<ActionResult<BillingData>> {
  try {
    const data = await withPermission('settings.view', async (ctx) => {
      const db = getTenantDb();
      const effectivePlan = await getEffectivePlan(ctx.tenantId);
      const limits = getPlan(effectivePlan).limits;

      const [tenant, contactCount, userCount, sequenceCount, siteCount] =
        await Promise.all([
          prisma.tenant.findUnique({
            where: { id: ctx.tenantId },
            select: {
              plan: true,
              subscriptionStatus: true,
              trialEndsAt: true,
              currentPeriodEnd: true,
              stripeCustomerId: true,
              stripeSubscriptionId: true,
            },
          }),
          db.contact.count({ where: { deletedAt: null } }),
          db.tenantUser.count({ where: { deletedAt: null } }),
          db.sequence.count({}),
          db.site.count({}),
        ]);

      if (!tenant) throw new Error('Tenant not found');

      const canEdit = await prisma.permission
        .findUnique({
          where: {
            roleId_resource_action: {
              roleId: ctx.roleId,
              resource: 'settings',
              action: 'edit',
            },
          },
        })
        .then((p) => p !== null);

      return {
        tenantId: ctx.tenantId,
        plan: effectivePlan,
        subscriptionStatus: tenant.subscriptionStatus,
        trialEndsAt: tenant.trialEndsAt?.toISOString() ?? null,
        currentPeriodEnd: tenant.currentPeriodEnd?.toISOString() ?? null,
        stripeCustomerId: tenant.stripeCustomerId,
        stripeSubscriptionId: tenant.stripeSubscriptionId,
        usage: {
          contacts: { current: contactCount, max: limits.maxContacts },
          users: { current: userCount, max: limits.maxUsers },
          sequences: { current: sequenceCount, max: limits.maxSequences },
          sites: { current: siteCount, max: limits.maxSites },
        },
        canEdit,
      } satisfies BillingData;
    });

    return { success: true, data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to load billing data';
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// createCheckoutSession
// ---------------------------------------------------------------------------

export async function createCheckoutSession(
  planId: string
): Promise<ActionResult<{ url: string }>> {
  const stripe = getStripeClientSafe();
  if (!stripe) {
    return { success: false, error: 'Stripe is not configured on this instance.' };
  }

  const plan = getPlan(planId);
  if (!plan.stripePriceId) {
    return { success: false, error: `No Stripe price configured for plan "${planId}".` };
  }

  if (!PLAN_ORDER.includes(planId as (typeof PLAN_ORDER)[number])) {
    return { success: false, error: 'Invalid plan.' };
  }

  try {
    const result = await withPermission('settings.edit', async (ctx) => {
      const tenant = await prisma.tenant.findUnique({
        where: { id: ctx.tenantId },
        select: { stripeCustomerId: true, stripeSubscriptionId: true },
      });

      if (!tenant) throw new Error('Tenant not found');

      // If already subscribed, redirect to portal instead of new checkout
      if (tenant.stripeSubscriptionId) {
        return { alreadySubscribed: true, customerId: tenant.stripeCustomerId };
      }

      const baseUrl = getAppUrl();

      // Resolve or create Stripe customer
      let customerId = tenant.stripeCustomerId ?? undefined;

      if (!customerId) {
        const user = await prisma.user.findUnique({
          where: { id: ctx.userId },
          select: { email: true, name: true },
        });

        const customer = await stripe.customers.create({
          email: user?.email,
          name: user?.name ?? undefined,
          metadata: { tenantId: ctx.tenantId },
        });
        customerId = customer.id;

        // Persist immediately so we don't create duplicates on retry
        await prisma.tenant.update({
          where: { id: ctx.tenantId },
          data: { stripeCustomerId: customerId },
        });
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: plan.stripePriceId!, quantity: 1 }],
        success_url: `${baseUrl}/settings?tab=billing&checkout=success`,
        cancel_url: `${baseUrl}/settings?tab=billing&checkout=cancel`,
        // Idempotency: embed tenant+plan in client_reference_id so webhook can
        // reconcile even if the session.completed fires before we get the URL
        client_reference_id: `${ctx.tenantId}:${planId}`,
        subscription_data: {
          metadata: { tenantId: ctx.tenantId, planId },
        },
        allow_promotion_codes: true,
      });

      if (!session.url) throw new Error('Stripe did not return a checkout URL');

      return { url: session.url };
    });

    if ('alreadySubscribed' in result) {
      // Bounce to portal
      const portalResult = await createPortalSession();
      if (!portalResult.success) return portalResult;
      return { success: true, data: { url: portalResult.data.url } };
    }

    return { success: true, data: { url: result.url } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create checkout session';
    return { success: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// createPortalSession
// ---------------------------------------------------------------------------

export async function createPortalSession(): Promise<ActionResult<{ url: string }>> {
  const stripe = getStripeClientSafe();
  if (!stripe) {
    return { success: false, error: 'Stripe is not configured on this instance.' };
  }

  try {
    const result = await withPermission('settings.edit', async (ctx) => {
      const tenant = await prisma.tenant.findUnique({
        where: { id: ctx.tenantId },
        select: { stripeCustomerId: true },
      });

      if (!tenant?.stripeCustomerId) {
        throw new Error('No billing account found. Subscribe to a plan first.');
      }

      const baseUrl = getAppUrl();

      const session = await stripe.billingPortal.sessions.create({
        customer: tenant.stripeCustomerId,
        return_url: `${baseUrl}/settings?tab=billing`,
      });

      return { url: session.url };
    });

    return { success: true, data: { url: result.url } };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to open billing portal';
    return { success: false, error: msg };
  }
}
