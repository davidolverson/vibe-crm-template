import { withPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { getTenantDb } from '@/lib/prisma-tenant';
import { getPlan } from '@/lib/plans';
import { getEffectivePlan } from '@/lib/plan-enforcement';
import { BillingClient } from './billing-client';
import type { BillingData } from './actions';

export const metadata = { title: 'Billing | VIBE' };

export default async function BillingPage() {
  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);

  const billing = await withPermission('settings.view', async (ctx) => {
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

  return <BillingClient billing={billing} stripeConfigured={stripeConfigured} />;
}
