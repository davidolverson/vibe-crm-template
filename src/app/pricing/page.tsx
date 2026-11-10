import type { Metadata } from 'next';
import Link from 'next/link';
import { Check, Minus } from 'lucide-react';
import { PLANS, PLAN_ORDER, TRIAL_DAYS, type PlanDef } from '@/lib/plans';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ENTERPRISE_EMAIL = '/contact?reason=pricing';

function formatLimit(value: number): string {
  if (value >= 1_000_000) return 'Unlimited';
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return value.toLocaleString();
}

function getPlanCta(plan: PlanDef): { label: string; href: string } {
  if (plan.id === 'free') {
    return { label: 'Create free workspace', href: '/sign-up' };
  }
  if (plan.id === 'enterprise') {
    return { label: 'Contact Us', href: ENTERPRISE_EMAIL };
  }
  return { label: `Start Free Trial`, href: '/sign-up' };
}

// ---------------------------------------------------------------------------
// Feature rows for the comparison table
// ---------------------------------------------------------------------------

interface FeatureRow {
  label: string;
  getValue: (plan: PlanDef) => string | boolean;
}

const FEATURE_ROWS: FeatureRow[] = [
  {
    label: 'Team members',
    getValue: (p) => formatLimit(p.limits.maxUsers),
  },
  {
    label: 'Contacts',
    getValue: (p) => formatLimit(p.limits.maxContacts),
  },
  {
    label: 'Sequences',
    getValue: (p) => formatLimit(p.limits.maxSequences),
  },
  {
    label: 'Landing sites',
    getValue: (p) => formatLimit(p.limits.maxSites),
  },
  {
    label: 'Emails / month',
    getValue: (p) => formatLimit(p.limits.maxMonthlyEmails),
  },
  {
    label: 'SMS messages / month',
    getValue: (p) => formatLimit(p.limits.maxMonthlyMessages),
  },
  {
    label: 'Pipeline management',
    getValue: () => true,
  },
  {
    label: 'Form builder',
    getValue: () => true,
  },
  {
    label: 'Activity feed',
    getValue: () => true,
  },
  {
    label: 'Task management',
    getValue: () => true,
  },
  {
    label: 'Multi-user roles',
    getValue: (p) => p.id !== 'free',
  },
  {
    label: 'API access',
    getValue: (p) => p.id === 'pro' || p.id === 'enterprise',
  },
  {
    label: 'Dedicated support',
    getValue: (p) => p.id === 'enterprise',
  },
  {
    label: 'Custom integrations',
    getValue: (p) => p.id === 'enterprise',
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PlanBadge({ label }: { label: string }) {
  return (
    <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-[#D4A017] text-[#0A0A0F]">
      {label}
    </span>
  );
}

function FeatureValue({ value }: { value: string | boolean }) {
  if (typeof value === 'boolean') {
    return value ? (
      <Check className="mx-auto h-4 w-4 text-[#D4A017]" aria-label="Included" />
    ) : (
      <Minus className="mx-auto h-4 w-4 text-zinc-700" aria-label="Not included" />
    );
  }
  return <span className="text-sm text-zinc-300">{value}</span>;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'VIBE plans for real estate brokerages. Founding 50 pricing open now: Starter $600/mo, Pro $900/mo, Enterprise $1,500/mo with a 60-day trial. Regular pricing $1,000 / $1,500 / $2,500 after Founding 50 closes.',
  openGraph: {
    title: 'VIBE pricing',
    description:
      'Founding 50 pricing: Starter $600, Pro $900, Enterprise $1,500 per month with a 60-day trial. Locked in forever.',
    url: 'https://example.com/pricing',
  },
  alternates: { canonical: 'https://example.com/pricing' },
};

export default function PricingPage() {
  const plans = PLAN_ORDER.map((id) => PLANS[id]);

  return (
    <main className="min-h-screen bg-[#0A0A0F] text-white">
      {/* ------------------------------------------------------------------ */}
      {/* Top nav */}
      {/* ------------------------------------------------------------------ */}
      <nav className="border-b border-zinc-800/60 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-widest text-[#D4A017]">VIBE</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="text-sm px-4 py-2 rounded-lg border border-zinc-700 text-zinc-300 hover:border-[#D4A017] hover:text-[#D4A017] transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="text-sm px-4 py-2 rounded-lg bg-[#D4A017] text-[#0A0A0F] font-bold hover:bg-[#D4A017]/90 transition-colors"
            >
              Create your workspace
            </Link>
          </div>
        </div>
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* Hero */}
      {/* ------------------------------------------------------------------ */}
      <section className="max-w-6xl mx-auto px-4 pt-16 pb-12 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-4">
          Plans that{' '}
          <span className="text-[#D4A017]">fit your brokerage</span>
        </h1>
        <p className="text-zinc-400 text-lg max-w-xl mx-auto">
          Start free. Scale when your team grows. No hidden fees, no surprise overages.
        </p>
        <p className="mt-3 text-sm text-zinc-500">
          Founding 50 members get a 60-day trial. After Founding 50 closes,
          paid plans include a {TRIAL_DAYS}-day free trial. No credit card required to start.
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Founding 50 pricing */}
      {/* ------------------------------------------------------------------ */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="mb-10 text-center">
          <span className="inline-block px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-[#D4A017] text-[#0A0A0F]">
            Open now
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-bold text-white">
            Founding 50 pricing{' '}
            <span className="text-[#D4A017]">(open now)</span>
          </h2>
          <p className="mt-3 text-zinc-400 max-w-xl mx-auto">
            Claim one of the first 50 spots and lock in these rates forever.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Founding Starter */}
          <div className="relative flex flex-col rounded-xl border border-[#D4A017]/50 bg-[#D4A017]/5 shadow-[0_0_32px_rgba(212,160,23,0.12)] py-7 px-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-1">Starter</h3>
              <p className="text-sm text-zinc-400">For small teams closing deals</p>
            </div>
            <div className="mb-2">
              <span className="text-3xl font-bold text-[#D4A017]">$600</span>
              <span className="text-zinc-500 text-sm ml-1">/ month</span>
            </div>
            <p className="text-xs text-zinc-500 mb-6">
              40% off regular $1,000/mo
            </p>
            <ul className="flex-1 space-y-3 mb-8">
              <li className="flex items-start gap-2.5 text-sm text-zinc-300">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A017]" />
                <span>60-day free trial</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-zinc-300">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A017]" />
                <span>Pro features for 6 months</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-zinc-300">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A017]" />
                <span>Founder pricing locked in forever</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-zinc-300">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A017]" />
                <span>Direct line to the founder</span>
              </li>
            </ul>
            <Link
              href="/sign-up"
              className="block text-center py-2.5 px-4 rounded-lg text-sm font-semibold bg-[#D4A017] text-[#0A0A0F] hover:bg-[#D4A017]/90 transition-colors"
            >
              Claim my Founding spot
            </Link>
          </div>

          {/* Founding Pro */}
          <div className="relative flex flex-col rounded-xl border border-[#D4A017] bg-[#D4A017]/10 shadow-[0_0_40px_rgba(212,160,23,0.2)] py-7 px-6">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <PlanBadge label="Most Popular" />
            </div>
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-1">Pro</h3>
              <p className="text-sm text-zinc-400">For growing brokerages</p>
            </div>
            <div className="mb-2">
              <span className="text-3xl font-bold text-[#D4A017]">$900</span>
              <span className="text-zinc-500 text-sm ml-1">/ month</span>
            </div>
            <p className="text-xs text-zinc-500 mb-6">
              40% off regular $1,500/mo
            </p>
            <ul className="flex-1 space-y-3 mb-8">
              <li className="flex items-start gap-2.5 text-sm text-zinc-300">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A017]" />
                <span>60-day free trial</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-zinc-300">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A017]" />
                <span>Pro features for 6 months</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-zinc-300">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A017]" />
                <span>Founder pricing locked in forever</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-zinc-300">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A017]" />
                <span>Priority support + feature influence</span>
              </li>
            </ul>
            <Link
              href="/sign-up"
              className="block text-center py-2.5 px-4 rounded-lg text-sm font-semibold bg-[#D4A017] text-[#0A0A0F] hover:bg-[#D4A017]/90 transition-colors"
            >
              Claim my Founding spot
            </Link>
          </div>

          {/* Founding Enterprise */}
          <div className="relative flex flex-col rounded-xl border border-[#D4A017]/50 bg-[#D4A017]/5 shadow-[0_0_32px_rgba(212,160,23,0.12)] py-7 px-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-1">Enterprise</h3>
              <p className="text-sm text-zinc-400">For multi-entity operations</p>
            </div>
            <div className="mb-2">
              <span className="text-3xl font-bold text-[#D4A017]">$1,500</span>
              <span className="text-zinc-500 text-sm ml-1">/ month</span>
            </div>
            <p className="text-xs text-zinc-500 mb-6">
              40% off regular $2,500/mo
            </p>
            <ul className="flex-1 space-y-3 mb-8">
              <li className="flex items-start gap-2.5 text-sm text-zinc-300">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A017]" />
                <span>60-day free trial</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-zinc-300">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A017]" />
                <span>Dedicated support</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-zinc-300">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A017]" />
                <span>Founder pricing locked in forever</span>
              </li>
              <li className="flex items-start gap-2.5 text-sm text-zinc-300">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A017]" />
                <span>Custom integrations</span>
              </li>
            </ul>
            <Link
              href="/sign-up"
              className="block text-center py-2.5 px-4 rounded-lg text-sm font-semibold bg-[#D4A017] text-[#0A0A0F] hover:bg-[#D4A017]/90 transition-colors"
            >
              Claim my Founding spot
            </Link>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-zinc-500 max-w-2xl mx-auto">
          After Founding 50 closes, prices return to $1,000 / $1,500 / $2,500
          with a {TRIAL_DAYS}-day trial. Founders keep 20% off permanently
          ($800 / $1,200 / $2,000).
        </p>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Regular plan cards (post Founding 50) */}
      {/* ------------------------------------------------------------------ */}
      <section className="max-w-6xl mx-auto px-4 pb-16">
        <div className="mb-10 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            After Founding 50 closes
          </h2>
          <p className="mt-3 text-zinc-400 max-w-xl mx-auto text-sm">
            Standard pricing once the first 50 seats are claimed.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const isPro = plan.id === 'pro';
            const cta = getPlanCta(plan);

            return (
              <div
                key={plan.id}
                className={[
                  'relative flex flex-col rounded-xl border py-7 px-6',
                  isPro
                    ? 'border-[#D4A017] bg-[#D4A017]/5 shadow-[0_0_32px_rgba(212,160,23,0.12)]'
                    : 'border-zinc-800 bg-zinc-900/50',
                ].join(' ')}
              >
                {/* Best Value badge */}
                {isPro && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <PlanBadge label="Best Value" />
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-white mb-1">{plan.name}</h2>
                  <p className="text-sm text-zinc-400">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <span
                    className={[
                      'text-3xl font-bold',
                      isPro ? 'text-[#D4A017]' : 'text-white',
                    ].join(' ')}
                  >
                    {plan.id === 'free'
                      ? 'Free'
                      : plan.priceLabel.replace('/mo', '')}
                  </span>
                  {plan.id !== 'free' && (
                    <span className="text-zinc-500 text-sm ml-1">/ month</span>
                  )}
                </div>

                {/* Feature list */}
                <ul className="flex-1 space-y-3 mb-8">
                  <li className="flex items-start gap-2.5 text-sm text-zinc-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A017]" />
                    <span>
                      <strong className="text-white">{formatLimit(plan.limits.maxUsers)}</strong>{' '}
                      {plan.limits.maxUsers === 1 ? 'user' : 'team members'}
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-zinc-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A017]" />
                    <span>
                      <strong className="text-white">{formatLimit(plan.limits.maxContacts)}</strong> contacts
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-zinc-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A017]" />
                    <span>
                      <strong className="text-white">{formatLimit(plan.limits.maxSequences)}</strong>{' '}
                      {plan.limits.maxSequences === 1 ? 'sequence' : 'sequences'}
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-zinc-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A017]" />
                    <span>
                      <strong className="text-white">{formatLimit(plan.limits.maxSites)}</strong>{' '}
                      landing {plan.limits.maxSites === 1 ? 'site' : 'sites'}
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-zinc-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A017]" />
                    <span>
                      <strong className="text-white">{formatLimit(plan.limits.maxMonthlyEmails)}</strong> emails/mo
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5 text-sm text-zinc-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A017]" />
                    <span>
                      <strong className="text-white">{formatLimit(plan.limits.maxMonthlyMessages)}</strong> SMS/mo
                    </span>
                  </li>
                  {plan.id !== 'free' && (
                    <li className="flex items-start gap-2.5 text-sm text-zinc-300">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A017]" />
                      <span>Multi-user roles</span>
                    </li>
                  )}
                  {(plan.id === 'pro' || plan.id === 'enterprise') && (
                    <li className="flex items-start gap-2.5 text-sm text-zinc-300">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A017]" />
                      <span>API access</span>
                    </li>
                  )}
                  {plan.id === 'enterprise' && (
                    <>
                      <li className="flex items-start gap-2.5 text-sm text-zinc-300">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A017]" />
                        <span>Dedicated support</span>
                      </li>
                      <li className="flex items-start gap-2.5 text-sm text-zinc-300">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#D4A017]" />
                        <span>Custom integrations</span>
                      </li>
                    </>
                  )}
                </ul>

                {/* CTA */}
                <Link
                  href={cta.href}
                  className={[
                    'block text-center py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors',
                    isPro
                      ? 'bg-[#D4A017] text-[#0A0A0F] hover:bg-[#D4A017]/90'
                      : plan.id === 'enterprise'
                        ? 'border border-zinc-600 text-zinc-300 hover:border-[#D4A017] hover:text-[#D4A017]'
                        : 'border border-zinc-700 text-zinc-300 hover:border-[#D4A017] hover:text-[#D4A017]',
                  ].join(' ')}
                >
                  {cta.label}
                </Link>

                {/* Trial note */}
                {plan.id !== 'free' && plan.id !== 'enterprise' && (
                  <p className="mt-2.5 text-center text-xs text-zinc-600">
                    {TRIAL_DAYS}-day free trial included
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Comparison table */}
      {/* ------------------------------------------------------------------ */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <h2 className="text-2xl font-bold text-center mb-8">
          Full feature comparison
        </h2>

        <div className="rounded-xl border border-zinc-800 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-5 py-4 text-zinc-400 font-medium w-48">Feature</th>
                {plans.map((plan) => (
                  <th
                    key={plan.id}
                    className={[
                      'px-4 py-4 font-semibold text-center',
                      plan.id === 'pro' ? 'text-[#D4A017]' : 'text-white',
                    ].join(' ')}
                  >
                    {plan.name}
                    {plan.id === 'pro' && (
                      <div className="mt-1">
                        <PlanBadge label="Best Value" />
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURE_ROWS.map((row, i) => (
                <tr
                  key={row.label}
                  className={[
                    'border-b border-zinc-800/60 last:border-0',
                    i % 2 === 0 ? 'bg-zinc-900/20' : '',
                  ].join(' ')}
                >
                  <td className="px-5 py-3.5 text-zinc-400">{row.label}</td>
                  {plans.map((plan) => (
                    <td key={plan.id} className="px-4 py-3.5 text-center">
                      <FeatureValue value={row.getValue(plan)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Bottom CTA */}
      {/* ------------------------------------------------------------------ */}
      <section className="border-t border-zinc-800/60 py-16 text-center px-4">
        <h2 className="text-2xl sm:text-3xl font-bold mb-3">
          Your pipeline, organized.
        </h2>
        <p className="text-zinc-400 mb-8 max-w-md mx-auto">
          Join brokerages already running their pipeline on VIBE. Start free, no credit card required.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/sign-up"
            className="px-8 py-3 rounded-lg bg-[#D4A017] text-[#0A0A0F] font-bold hover:bg-[#D4A017]/90 transition-colors"
          >
            Create your workspace
          </Link>
          <Link
            href={ENTERPRISE_EMAIL}
            className="px-8 py-3 rounded-lg border border-zinc-700 text-zinc-300 hover:border-[#D4A017] hover:text-[#D4A017] transition-colors"
          >
            Contact our team
          </Link>
        </div>
      </section>

      <footer className="pb-8 text-center space-y-2">
        <div className="flex justify-center gap-6 text-sm text-zinc-500">
          <Link href="/" className="hover:text-[#D4A017] transition-colors">Home</Link>
          <Link href="/sign-in" className="hover:text-[#D4A017] transition-colors">Sign In</Link>
          <Link href="/contact" className="hover:text-[#D4A017] transition-colors">Contact</Link>
        </div>
        <p className="text-zinc-600 text-xs">&copy; {new Date().getFullYear()} VIBE · Powered by ModernGrindTech</p>
      </footer>
    </main>
  );
}
