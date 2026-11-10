import type { Metadata } from 'next';
import Link from 'next/link';
import { LandingNav } from '@/components/landing/nav';
import { LandingFooter } from '@/components/landing/footer';

export const metadata: Metadata = {
  title: 'Welcome to VIBE Founding 50',
  description:
    'Your VIBE founding seat is locked in. Check your email for next steps.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/founding-50/success' },
};

/**
 * Stripe Checkout success_url target. Stripe redirects here after the
 * customer completes checkout; the heavy lifting (tenant provisioning,
 * magic link email) happens server-side in the Stripe webhook handler.
 *
 * Until the webhook extension lands, this page is the customer's "we got
 * your money, more in email" reassurance. The session_id query param is
 * present for diagnostics but not required for rendering.
 */
export default function FoundingSuccessPage() {
  return (
    <>
      <LandingNav />
      <main className="vibe-ink min-h-[80vh] flex items-center">
        <section className="max-w-2xl mx-auto px-6 py-32 text-center vibe-rise">
          <p className="vibe-eyebrow mb-6">Founding 50 -- Locked in</p>
          <h1 className="vibe-headline text-zinc-100 text-[clamp(32px,5vw,56px)] mb-6">
            Welcome to <span className="vibe-gold italic">VIBE</span>.
          </h1>
          <p className="text-zinc-300 text-lg leading-relaxed mb-6">
            Your founding seat is locked in. Your 60-day trial starts now.
          </p>
          <p className="text-zinc-300 text-base leading-relaxed mb-10">
            Check your email in the next few minutes for a sign-in link to
            finish setting up your account. If it does not arrive within 15
            minutes, check spam or reach{' '}
            <a className="vibe-gold underline" href="mailto:hello@example.com">
              hello@example.com
            </a>
            .
          </p>
          <Link
            href="/founding-50"
            className="inline-block px-8 py-3 border border-zinc-600 text-zinc-200 hover:border-zinc-400 hover:text-white transition-colors"
          >
            Back to Founding 50
          </Link>
        </section>
      </main>
      <LandingFooter />
    </>
  );
}
