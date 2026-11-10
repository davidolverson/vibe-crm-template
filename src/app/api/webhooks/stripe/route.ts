import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { PLANS, getPlan } from '@/lib/plans';
import { syncAiBudgetForTenant } from '@/lib/ai/budget-sync';
import { provisionTenant } from '@/lib/tenant-provision';
import { sendPublicEmail } from '@/lib/public-email';
import { auth } from '@/lib/auth-server';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export const runtime = 'nodejs'; // need Node crypto for webhook signature

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key);
}

function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  return secret;
}

/**
 * Derive our plan ID from a Stripe price ID by scanning PLANS config.
 * Returns null if no match -- keeps forward-compatibility with unknown prices.
 */
function planIdFromPriceId(priceId: string): string | null {
  for (const [id, plan] of Object.entries(PLANS)) {
    if (plan.stripePriceId === priceId) return id;
  }
  return null;
}

/**
 * Map a Stripe subscription status string to our stored status.
 * We only store the values our plan-enforcement layer knows about.
 */
function mapSubscriptionStatus(stripeStatus: Stripe.Subscription.Status): string {
  switch (stripeStatus) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'past_due':
      return 'past_due';
    case 'canceled':
      return 'canceled';
    case 'unpaid':
      return 'unpaid';
    default:
      // incomplete, incomplete_expired, paused -- treat as past_due
      return 'past_due';
  }
}

function resolveBaseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://app.example.com';
  return url.replace(/\/$/, '');
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const ref = session.client_reference_id ?? '';

  // Founding 50 checkouts (src/app/api/checkout/founding/route.ts) have no
  // tenant yet at checkout time -- client_reference_id is
  // "founding:<planId>:<email>" instead of "<tenantId>:<planId>".
  if (ref.startsWith('founding:')) {
    await handleFoundingCheckoutCompleted(session, ref);
    return;
  }

  // client_reference_id format: "<tenantId>:<planId>"
  const [tenantId, planIdFromRef] = ref.split(':');

  if (!tenantId) {
    console.error('[stripe-webhook] checkout.session.completed missing client_reference_id');
    return;
  }

  const customerId =
    typeof session.customer === 'string' ? session.customer : session.customer?.id;
  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id;

  if (!subscriptionId) {
    console.error('[stripe-webhook] checkout.session.completed missing subscription ID');
    return;
  }

  // Fetch the subscription to get the price and period details
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const firstItem = subscription.items.data[0];
  const priceId = firstItem?.price.id;
  // Do NOT default unknown checkouts to 'starter' -- that would silently
  // reprovision the wrong plan for metered add-ons or future SKUs. If we
  // can't derive a known plan, keep whatever's already on the tenant and
  // just record the subscription details.
  const resolvedPlanId =
    planIdFromRef || (priceId ? planIdFromPriceId(priceId) : null);

  if (!resolvedPlanId) {
    console.warn(
      `[stripe-webhook] Unknown priceId ${priceId} for tenant ${tenantId} -- not changing plan`
    );
  }

  // In Stripe v20 current_period_end lives on SubscriptionItem, not Subscription
  const periodEnd = firstItem?.current_period_end
    ? new Date(firstItem.current_period_end * 1000)
    : null;

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      ...(resolvedPlanId ? { plan: resolvedPlanId } : {}),
      subscriptionStatus: mapSubscriptionStatus(subscription.status),
      stripeCustomerId: customerId ?? undefined,
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId ?? undefined,
      currentPeriodEnd: periodEnd,
    },
  });

  if (resolvedPlanId) {
    await syncAiBudgetForTenant(tenantId);
  }

  console.info(
    `[stripe-webhook] Tenant ${tenantId} checkout completed` +
      (resolvedPlanId ? ` -- plan ${resolvedPlanId}` : ' -- no plan change')
  );
}

/**
 * Auto-provisions a brand-new tenant for a Founding 50 checkout, since (unlike
 * the normal signup flow) no user/organization/tenant exists yet at checkout
 * time -- the customer only entered an email and a plan on the public landing
 * page. Creates User + Organization + Member + Tenant, then emails a
 * Better Auth password-reset link so they can set their initial login.
 */
async function handleFoundingCheckoutCompleted(
  session: Stripe.Checkout.Session,
  ref: string
): Promise<void> {
  const [, planId, ...emailParts] = ref.split(':');
  const email = emailParts.join(':').toLowerCase().trim();

  if (!planId || !PLANS[planId] || !email) {
    console.error(`[stripe-webhook] Malformed founding client_reference_id: ${ref}`);
    return;
  }

  const customerId =
    typeof session.customer === 'string' ? session.customer : session.customer?.id;
  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id;

  if (!customerId || !subscriptionId) {
    console.error('[stripe-webhook] Founding checkout missing customer or subscription ID');
    return;
  }

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const firstItem = subscription.items.data[0];
  const priceId = firstItem?.price.id;
  const periodEnd = firstItem?.current_period_end
    ? new Date(firstItem.current_period_end * 1000)
    : null;
  const trialEndsAt = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;
  const subscriptionStatus = mapSubscriptionStatus(subscription.status);

  // Idempotent: a tenant already tied to this Stripe customer means this
  // event is a retry/replay of a checkout we already provisioned.
  const existingTenant = await prisma.tenant.findUnique({ where: { stripeCustomerId: customerId } });
  if (existingTenant) {
    await prisma.tenant.update({
      where: { id: existingTenant.id },
      data: {
        plan: planId,
        subscriptionStatus,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: priceId ?? undefined,
        currentPeriodEnd: periodEnd,
        trialEndsAt,
      },
    });
    await syncAiBudgetForTenant(existingTenant.id);
    console.info(
      `[stripe-webhook] Founding checkout replay for tenant ${existingTenant.id} -- resynced subscription`
    );
    return;
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    const ownedTenant = await prisma.tenantUser.findFirst({
      where: { userId: existingUser.id, deletedAt: null },
      select: { tenantId: true },
    });

    if (ownedTenant) {
      // Already has a workspace -- auto-attaching billing here would mean
      // guessing which tenant to bill. Don't provision automatically.
      console.warn(
        `[stripe-webhook] Founding checkout for ${email} matches a user who already has a tenant -- needs manual reconciliation`
      );
      await notifyFoundingNeedsManualReview({
        email,
        planId,
        customerId,
        subscriptionId,
        reason: 'existing user already has a tenant',
      });
      return;
    }

    // User exists (e.g. an abandoned free-tier signup) but has no workspace
    // yet -- safe to provision a fresh tenant for them.
    const tenant = await provisionFoundingTenant({
      userId: existingUser.id,
      email,
      planId,
      customerId,
      subscriptionId,
      priceId,
      periodEnd,
      trialEndsAt,
      subscriptionStatus,
    });
    await syncAiBudgetForTenant(tenant.id);
    await sendFoundingWelcomeEmail({ email, planId, existingAccount: true });
    console.info(
      `[stripe-webhook] Founding checkout provisioned tenant ${tenant.id} for existing user ${existingUser.id}`
    );
    return;
  }

  const namePart = email.split('@')[0] || 'Founding';
  const displayName = namePart.charAt(0).toUpperCase() + namePart.slice(1);

  const user = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      name: displayName,
      email,
      // Stripe checkout already confirmed the customer owns this inbox
      // (payment receipt + confirmation went there) -- trust it.
      emailVerified: true,
    },
  });

  const tenant = await provisionFoundingTenant({
    userId: user.id,
    email,
    planId,
    customerId,
    subscriptionId,
    priceId,
    periodEnd,
    trialEndsAt,
    subscriptionStatus,
    tenantName: `${displayName}'s Brokerage`,
  });

  await syncAiBudgetForTenant(tenant.id);

  try {
    await auth.api.requestPasswordReset({
      body: { email, redirectTo: `${resolveBaseUrl()}/reset-password` },
    });
  } catch (err) {
    console.error('[stripe-webhook] Failed to send founding password-set email:', err);
  }

  await sendFoundingWelcomeEmail({ email, planId, existingAccount: false });

  console.info(
    `[stripe-webhook] Founding checkout auto-provisioned tenant ${tenant.id} + user ${user.id} for ${email}`
  );
}

async function provisionFoundingTenant(params: {
  userId: string;
  email: string;
  planId: string;
  customerId: string;
  subscriptionId: string;
  priceId: string | undefined;
  periodEnd: Date | null;
  trialEndsAt: Date | null;
  subscriptionStatus: string;
  tenantName?: string;
}) {
  const orgName = params.tenantName ?? `${params.email.split('@')[0]}'s Brokerage`;

  const org = await prisma.organization.create({
    data: {
      id: crypto.randomUUID(),
      name: orgName,
    },
  });

  await prisma.member.create({
    data: {
      id: crypto.randomUUID(),
      userId: params.userId,
      organizationId: org.id,
      role: 'owner',
    },
  });

  const tenant = await provisionTenant({
    organizationId: org.id,
    name: orgName,
    createdByUserId: params.userId,
  });

  return prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      plan: params.planId,
      subscriptionStatus: params.subscriptionStatus,
      stripeCustomerId: params.customerId,
      stripeSubscriptionId: params.subscriptionId,
      stripePriceId: params.priceId ?? undefined,
      currentPeriodEnd: params.periodEnd,
      trialEndsAt: params.trialEndsAt,
    },
  });
}

async function sendFoundingWelcomeEmail(params: {
  email: string;
  planId: string;
  existingAccount: boolean;
}): Promise<void> {
  const plan = getPlan(params.planId);
  const baseUrl = resolveBaseUrl();
  const subject = `You're in -- VIBE Founding ${plan.name} is live`;
  const nextStep = params.existingAccount
    ? `Sign in with your existing password at ${baseUrl}/sign-in -- your ${plan.name} plan is active on your account now.`
    : `Look for a separate "set your password" email at this same address to finish setting up your login, then sign in at ${baseUrl}/sign-in.`;

  const text = [
    `You're a VIBE Founding member on the ${plan.name} plan (${plan.priceLabel}).`,
    '',
    nextStep,
    '',
    `Questions? Just reply to this email.`,
    '',
    '-- VIBE',
  ].join('\n');

  const result = await sendPublicEmail({
    to: params.email,
    subject,
    text,
    skipUnsubscribe: true,
  });

  if (!result.ok) {
    console.error('[stripe-webhook] Founding welcome email failed:', result.reason);
  }
}

async function notifyFoundingNeedsManualReview(params: {
  email: string;
  planId: string;
  customerId: string;
  subscriptionId: string;
  reason: string;
}): Promise<void> {
  const inbox = process.env.WAITLIST_INBOX ?? 'owner@example.com';
  await sendPublicEmail({
    to: inbox,
    subject: `[VIBE Founding 50] Manual review needed -- ${params.email}`,
    text: [
      `A Founding 50 Stripe checkout completed but could not be auto-provisioned.`,
      '',
      `Email:           ${params.email}`,
      `Plan:            ${params.planId}`,
      `Stripe customer: ${params.customerId}`,
      `Subscription:    ${params.subscriptionId}`,
      `Reason:          ${params.reason}`,
      '',
      `Action: check the Stripe dashboard and manually attach this subscription to the right tenant.`,
    ].join('\n'),
    skipUnsubscribe: true,
  });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId =
    typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;
  const tenant = await prisma.tenant.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  if (!tenant) return;
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { subscriptionStatus: 'past_due' },
  });
  console.info(`[stripe-webhook] Tenant ${tenant.id} moved to past_due on invoice.payment_failed`);
}

async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const customerId =
    typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;
  const tenant = await prisma.tenant.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true, subscriptionStatus: true },
  });
  if (!tenant) return;
  // Only flip back to active if we were in a failed-payment state. Leave
  // trialing/canceled etc. alone.
  if (tenant.subscriptionStatus === 'past_due' || tenant.subscriptionStatus === 'unpaid') {
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { subscriptionStatus: 'active' },
    });
    console.info(`[stripe-webhook] Tenant ${tenant.id} back to active on invoice.paid`);
  }
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  const tenantId = subscription.metadata?.tenantId;
  if (!tenantId) {
    // Fall back to looking up by stripeSubscriptionId
    const tenant = await prisma.tenant.findUnique({
      where: { stripeSubscriptionId: subscription.id },
      select: { id: true },
    });
    if (!tenant) {
      console.warn(`[stripe-webhook] No tenant found for subscription ${subscription.id}`);
      return;
    }
    return updateTenantSubscription(tenant.id, subscription);
  }
  return updateTenantSubscription(tenantId, subscription);
}

async function updateTenantSubscription(
  tenantId: string,
  subscription: Stripe.Subscription
): Promise<void> {
  const firstItem = subscription.items.data[0];
  const priceId = firstItem?.price.id;
  const resolvedPlanId = priceId ? planIdFromPriceId(priceId) : null;

  // In Stripe v20 current_period_end lives on SubscriptionItem, not Subscription
  const periodEnd = firstItem?.current_period_end
    ? new Date(firstItem.current_period_end * 1000)
    : null;

  const mappedStatus = mapSubscriptionStatus(subscription.status);

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      ...(resolvedPlanId ? { plan: resolvedPlanId } : {}),
      subscriptionStatus: mappedStatus,
      stripePriceId: priceId ?? undefined,
      currentPeriodEnd: periodEnd,
    },
  });

  if (resolvedPlanId) {
    await syncAiBudgetForTenant(tenantId);
  }

  console.info(
    `[stripe-webhook] Tenant ${tenantId} subscription updated -- status: ${mappedStatus}` +
    (resolvedPlanId ? `, plan: ${resolvedPlanId}` : '')
  );
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  const tenantId = subscription.metadata?.tenantId;

  const tenant = tenantId
    ? await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } })
    : await prisma.tenant.findUnique({
        where: { stripeSubscriptionId: subscription.id },
        select: { id: true },
      });

  if (!tenant) {
    console.warn(`[stripe-webhook] No tenant found for deleted subscription ${subscription.id}`);
    return;
  }

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      plan: 'free',
      subscriptionStatus: 'canceled',
      stripeSubscriptionId: null,
      stripePriceId: null,
      currentPeriodEnd: null,
    },
  });

  console.info(`[stripe-webhook] Tenant ${tenant.id} downgraded to free (subscription canceled)`);
}

// ---------------------------------------------------------------------------
// POST /api/webhooks/stripe
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Missing Stripe config: in production, return 503 so Stripe retries and we
  // notice via alerts. In non-prod (local dev), accept-and-ack to keep noise
  // down when the webhook forwarder is running without keys set.
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[stripe-webhook] Stripe env vars missing in production; returning 503');
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
    }
    return NextResponse.json({ received: true, note: 'Stripe not configured' }, { status: 200 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, signature, getWebhookSecret());
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid signature';
    console.error('[stripe-webhook] Signature verification failed:', msg);
    return NextResponse.json({ error: `Webhook signature invalid: ${msg}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.paid':
      case 'invoice.payment_succeeded':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      default:
        // Acknowledge unhandled events without error -- Stripe expects 2xx
        console.info(`[stripe-webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Handler error';
    console.error(`[stripe-webhook] Error handling ${event.type}:`, msg);
    // Return 500 so Stripe retries transient failures (DB unavailable, etc.)
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
