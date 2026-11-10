import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';
import { sendPublicEmail } from '@/lib/public-email';
import { recordSubmission } from '@/lib/public-submissions';
import { waitlistAdminEmail } from '@/lib/waitlist';
import { getPlan } from '@/lib/plans';
import { getStripeClient } from '@/lib/stripe';

export const runtime = 'nodejs';

/**
 * Public Founding 50 checkout endpoint.
 *
 * Two modes, picked at runtime by env presence:
 *
 * 1. Stripe live (STRIPE_SECRET_KEY + plan price ID set): create a Stripe
 *    Checkout Session with a 60-day trial and `client_reference_id` formatted
 *    as `founding:<planId>:<email>`. The webhook handler at
 *    `src/app/api/webhooks/stripe/route.ts` will detect the `founding:` prefix
 *    and provision the tenant on completion (TODO: webhook extension lives
 *    in a separate task; until that ships, completed checkouts will land in
 *    Stripe but not auto-provision -- David handles those manually for the
 *    first batch of founding members).
 *
 * 2. Fallback (Stripe not configured, e.g. dad-blocked merchant setup as of
 *    2026-04-29): degrade gracefully to the same DB record + admin email
 *    flow that /api/waitlist uses, and return a queued-state redirect URL.
 *    This keeps the founding-50 page CTAs functional today and lets the
 *    same endpoint flip on to live checkout the moment STRIPE_SECRET_KEY
 *    is pasted into Vercel.
 */

const FOUNDING_PLAN_IDS = ['starter', 'pro', 'enterprise'] as const;
type FoundingPlanId = (typeof FOUNDING_PLAN_IDS)[number];

const bodySchema = z.object({
  email: z.string().email().max(254).trim().toLowerCase(),
  planId: z.enum(FOUNDING_PLAN_IDS),
});

const TRIAL_DAYS = 60;

function resolveIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}

function getAppUrl(req: NextRequest): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'example.com';
  return `${proto}://${host}`;
}

function isStripeConfigured(planId: FoundingPlanId): boolean {
  if (!process.env.STRIPE_SECRET_KEY) return false;
  const plan = getPlan(planId);
  return Boolean(plan.stripePriceId);
}

async function fallbackToWaitlist(params: {
  email: string;
  planId: FoundingPlanId;
  ip: string;
  userAgent: string | undefined;
}): Promise<void> {
  const inbox = process.env.WAITLIST_INBOX ?? 'owner@example.com';
  const subject = `[VIBE Founding 50] Intent to subscribe (${params.planId}) -- ${params.email}`;
  const text = [
    `Founding 50 checkout intent on example.com while Stripe is dad-blocked.`,
    '',
    `Email:       ${params.email}`,
    `Plan:        ${params.planId}`,
    `User-Agent:  ${params.userAgent ?? 'unknown'}`,
    `IP:          ${params.ip}`,
    `Timestamp:   ${new Date().toISOString()}`,
    '',
    `Action: contact this lead manually until Stripe activation completes.`,
  ].join('\n');

  await Promise.allSettled([
    recordSubmission({
      kind: 'waitlist',
      email: params.email,
      context: `founding-checkout-${params.planId}`,
      ip: params.ip,
      userAgent: params.userAgent,
    }),
    sendPublicEmail({
      to: inbox,
      subject,
      text,
      replyTo: params.email,
      skipUnsubscribe: true,
    }),
  ]);
}

export async function POST(req: NextRequest) {
  const ip = resolveIp(req);
  const rl = rateLimit(`founding-checkout:${ip}`, 5, 60_000);
  if (!rl.success) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests. Try again in a minute.' },
      { status: 429 },
    );
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    const raw = await req.json();
    parsed = bodySchema.parse(raw);
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Please enter a valid email and pick a plan.' },
      { status: 400 },
    );
  }

  const userAgent = req.headers.get('user-agent') ?? undefined;
  const baseUrl = getAppUrl(req);

  if (!isStripeConfigured(parsed.planId)) {
    await fallbackToWaitlist({
      email: parsed.email,
      planId: parsed.planId,
      ip,
      userAgent,
    });
    return NextResponse.json({
      ok: true,
      mode: 'queued',
      url: `${baseUrl}/founding-50/queued`,
    });
  }

  // Stripe path. Any failure here should NOT silently lose the lead -- fall
  // through to the waitlist capture so we keep the email and David can
  // recover the customer manually.
  try {
    const plan = getPlan(parsed.planId);
    const priceId = plan.stripePriceId;
    if (!priceId) throw new Error(`Plan ${parsed.planId} has no stripePriceId`);

    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: parsed.email,
      client_reference_id: `founding:${parsed.planId}:${parsed.email}`,
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata: {
          foundingMember: 'true',
          foundingPlanId: parsed.planId,
          foundingEmail: parsed.email,
        },
      },
      success_url: `${baseUrl}/founding-50/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/founding-50/cancel`,
      allow_promotion_codes: true,
    });

    if (!session.url) throw new Error('Stripe did not return a checkout URL');

    // Best-effort lead capture in parallel with returning the URL. If the DB
    // write fails we still want the customer to reach Stripe.
    void recordSubmission({
      kind: 'waitlist',
      email: parsed.email,
      context: `founding-stripe-${parsed.planId}`,
      ip,
      userAgent,
    }).catch((err) => {
      console.error('[founding-checkout] DB record failed:', err);
    });

    return NextResponse.json({
      ok: true,
      mode: 'stripe',
      url: session.url,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Stripe checkout failed';
    console.error('[founding-checkout] Stripe path failed, falling back to waitlist:', msg);
    await fallbackToWaitlist({
      email: parsed.email,
      planId: parsed.planId,
      ip,
      userAgent,
    });
    return NextResponse.json({
      ok: true,
      mode: 'queued-after-stripe-error',
      url: `${baseUrl}/founding-50/queued`,
    });
  }
}
