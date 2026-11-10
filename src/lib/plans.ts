/**
 * Plan definitions for VIBE.
 *
 * Stripe price IDs are set via env vars so they work across test/live mode.
 * Plan limits are enforced at the application layer.
 */

export interface PlanLimits {
  maxUsers: number;
  maxContacts: number;
  maxSequences: number;
  maxSites: number;
  maxMonthlyEmails: number;
  maxMonthlyMessages: number;
  /** Bundled AI draft + rewrite calls per billing month. Overage billed via Stripe meter. */
  maxMonthlyAiDrafts: number;
}

export interface PlanDef {
  id: string;
  name: string;
  description: string;
  priceMonthly: number; // in cents
  priceLabel: string;
  limits: PlanLimits;
  stripePriceId: string | undefined;
}

export const PLANS: Record<string, PlanDef> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'For solo agents getting started',
    priceMonthly: 0,
    priceLabel: 'Free forever',
    limits: {
      maxUsers: 1,
      maxContacts: 100,
      maxSequences: 1,
      maxSites: 1,
      maxMonthlyEmails: 50,
      maxMonthlyMessages: 25,
      maxMonthlyAiDrafts: 50,
    },
    stripePriceId: undefined,
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'For small teams closing deals',
    priceMonthly: 100000,
    priceLabel: '$1,000/mo',
    limits: {
      maxUsers: 5,
      maxContacts: 2500,
      maxSequences: 10,
      maxSites: 1,
      maxMonthlyEmails: 1000,
      maxMonthlyMessages: 500,
      maxMonthlyAiDrafts: 1500,
    },
    stripePriceId: process.env.STRIPE_PRICE_STARTER,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'For growing brokerages',
    priceMonthly: 150000,
    priceLabel: '$1,500/mo',
    limits: {
      maxUsers: 15,
      maxContacts: 25000,
      maxSequences: 50,
      maxSites: 5,
      maxMonthlyEmails: 10000,
      maxMonthlyMessages: 5000,
      maxMonthlyAiDrafts: 3000,
    },
    stripePriceId: process.env.STRIPE_PRICE_PRO,
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For multi-entity operations',
    priceMonthly: 250000,
    priceLabel: '$2,500/mo',
    limits: {
      maxUsers: 50,
      maxContacts: 100000,
      maxSequences: 200,
      maxSites: 20,
      maxMonthlyEmails: 50000,
      maxMonthlyMessages: 25000,
      maxMonthlyAiDrafts: 8000,
    },
    stripePriceId: process.env.STRIPE_PRICE_ENTERPRISE,
  },
};

export const PLAN_ORDER = ['free', 'starter', 'pro', 'enterprise'] as const;

export function getPlan(planId: string): PlanDef {
  return PLANS[planId] ?? PLANS.free;
}

export function getPlanLimits(planId: string): PlanLimits {
  return getPlan(planId).limits;
}

export const TRIAL_DAYS = 14;
