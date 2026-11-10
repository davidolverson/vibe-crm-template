import type { Metadata } from 'next';
import Link from 'next/link';
import { LandingNav } from '@/components/landing/nav';
import { LandingFooter } from '@/components/landing/footer';

export const metadata: Metadata = {
  title: 'Spot reserved -- VIBE Founding 50',
  description:
    'Your Founding 50 spot is queued. We will reach out within one business day to finish setup.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/founding-50/queued' },
};

/**
 * Landing page shown after a Founding 50 checkout intent is captured while
 * Stripe is not yet live (or after a Stripe-side error during session
 * creation). Reassures the customer their spot is reserved without
 * promising a charge that won't happen yet.
 */
export default function FoundingQueuedPage() {
  return (
    <>
      <LandingNav />
      <main className="vibe-ink min-h-[80vh] flex items-center">
        <section className="max-w-2xl mx-auto px-6 py-32 text-center vibe-rise">
          <p className="vibe-eyebrow mb-6">Founding 50 -- Spot reserved</p>
          <h1 className="vibe-headline text-zinc-100 text-[clamp(32px,5vw,56px)] mb-6">
            Got it. Your seat is held.
          </h1>
          <p className="text-zinc-300 text-lg leading-relaxed mb-10">
            We will reach out within one business day to finish onboarding
            and confirm your founding pricing. No charge has been made.
          </p>
          <p className="text-zinc-400 text-sm leading-relaxed mb-12">
            Want to fast-track? Reply directly to the confirmation email when
            it arrives, or reach the team at{' '}
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
