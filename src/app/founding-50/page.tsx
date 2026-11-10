import type { Metadata } from 'next';
import { LandingNav } from '@/components/landing/nav';
import { LandingFooter } from '@/components/landing/footer';
import { Battlefield } from '@/components/landing/battlefield';
import { Founding } from '@/components/landing/founding';
import { FinalCTA } from '@/components/landing/final-cta';
import { Wordmark } from '@/components/landing/wordmark';
import { FOUNDING_TOTAL, getFoundingSpotsRemaining } from '@/lib/waitlist';
import { SpotsCounter } from '@/components/landing/spots-counter';

export const metadata: Metadata = {
  title: 'Founding 50',
  description: `Claim one of ${FOUNDING_TOTAL} founding-operator seats at VIBE -- the CRM built for vertically integrated real estate businesses. 60-day trial, 40% off Year 1, 20% off permanently.`,
  openGraph: {
    title: 'Founding 50 -- VIBE',
    description:
      'Fifty operators in before anyone else. Locked-in founder pricing forever. Pay per business, not per seat.',
    url: 'https://example.com/founding-50',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Founding 50 -- VIBE',
    description:
      'Fifty operators in before anyone else. Locked-in founder pricing forever.',
  },
  alternates: { canonical: '/founding-50' },
};

const productJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'VIBE Founding 50',
  description:
    'Founding-operator seat at VIBE with 60-day free trial, Pro features for six months, 40% off Year 1, and 20% off permanently.',
  brand: { '@type': 'Brand', name: 'VIBE' },
  offers: {
    '@type': 'AggregateOffer',
    priceCurrency: 'USD',
    lowPrice: '600',
    highPrice: '1500',
    offerCount: String(FOUNDING_TOTAL),
    description: 'Founding-member pricing, locked in forever.',
  },
};

export default async function Founding50Page() {
  const remaining = await getFoundingSpotsRemaining();
  const claimed = FOUNDING_TOTAL - remaining;
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />

      <LandingNav />

      <main className="vibe-ink">
        {/* Condensed hero tuned for inbound paid/social clicks */}
        <section className="relative min-h-[68vh] flex flex-col items-center justify-center px-6 pt-32 pb-16 overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.05] pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(to right, #D4A017 1px, transparent 1px), linear-gradient(to bottom, #D4A017 1px, transparent 1px)',
              backgroundSize: '72px 72px',
              maskImage:
                'radial-gradient(ellipse 70% 55% at 50% 45%, black 20%, transparent 85%)',
            }}
          />
          <div className="relative max-w-4xl w-full flex flex-col items-center text-center vibe-rise">
            <p className="vibe-eyebrow mb-6">Founding 50 · Early-operator seats</p>
            <Wordmark size="lg" showAcronym tone="dark" className="mb-10" />
            <h1 className="vibe-headline text-zinc-100 text-[clamp(36px,6vw,72px)] max-w-3xl mb-5">
              Fifty operators.
              <br />
              <span className="vibe-gold italic">Before anyone else.</span>
            </h1>
            <p className="text-zinc-300 text-lg sm:text-xl max-w-2xl leading-relaxed mb-8">
              Founder pricing locks in forever. Starter $600, Pro $900,
              Enterprise $1,500 per business -- not per seat. 60-day trial.
              Direct line to the person building this.
            </p>

            <a
              href="#founding"
              className="vibe-gold-bg text-[#0A0A0F] vibe-pulse-glow rounded-full px-8 py-4 font-semibold text-base tracking-tight hover:brightness-110 transition-[filter] duration-200"
            >
              Claim a founding spot
            </a>

            <p className="mt-6 font-mono text-xs text-zinc-400 tracking-wider">
              <span className="inline-block w-2 h-2 rounded-full bg-[#D4A017] mr-2 align-middle" />
              <SpotsCounter
                remaining={remaining}
                className="vibe-gold font-semibold"
              />{' '}
              of {FOUNDING_TOTAL} seats open
              <span className="text-zinc-700 mx-2">·</span>
              <span className="tabular-nums">{claimed}</span> claimed
            </p>
          </div>
        </section>

        <Battlefield />
        <Founding foundingSpotsRemaining={remaining} />
        <FinalCTA />
      </main>

      <LandingFooter />
    </>
  );
}
