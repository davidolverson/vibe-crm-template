import Image from 'next/image';
import { Wordmark } from './wordmark';
import { SpotsCounter } from './spots-counter';

import { FOUNDING_TOTAL } from '@/lib/waitlist';

type HeroProps = {
  foundingSpotsRemaining: number;
};

export function Hero({ foundingSpotsRemaining }: HeroProps) {
  const claimed = FOUNDING_TOTAL - foundingSpotsRemaining;
  return (
    <section className="vibe-ink relative min-h-[92vh] flex flex-col items-center justify-center px-6 pt-32 pb-20 overflow-hidden">
      {/* Cinematic empire backdrop */}
      <div className="absolute inset-0 pointer-events-none">
        <Image
          src="/backgrounds/vibe-empire-hero.jpeg"
          alt=""
          aria-hidden
          fill
          priority
          className="object-cover opacity-[0.32]"
          sizes="100vw"
        />
        {/* Dim + vignette overlays stacked on the photo */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0F]/70 via-[#0A0A0F]/40 to-[#0A0A0F]" />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 40%, transparent 30%, rgba(10,10,15,0.85) 100%)',
          }}
        />
      </div>

      {/* gold grid, masked */}
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

      <div className="relative max-w-5xl w-full flex flex-col items-center text-center vibe-rise">
        <p className="vibe-eyebrow mb-8">
          The future of real estate is here
        </p>

        <Wordmark size="xl" showAcronym tone="dark" className="vibe-drift mb-12" />

        <h1 className="vibe-headline text-zinc-100 text-[clamp(40px,7vw,88px)] max-w-4xl mb-6">
          One CRM for your
          <br />
          <span className="vibe-gold italic">entire real estate empire.</span>
        </h1>

        <p className="text-zinc-300 text-lg sm:text-xl max-w-2xl leading-relaxed mb-10">
          Unified leads across real estate, mortgage, insurance, and investing.
          Multi-site capture. QuickBooks-synced financials. Stop duct-taping six
          platforms together.
        </p>

        <a
          href="#founding"
          className="vibe-gold-bg text-[#0A0A0F] vibe-pulse-glow rounded-full px-8 py-4 font-semibold text-base tracking-tight hover:brightness-110 transition-[filter] duration-200"
        >
          Claim a founding spot
        </a>

        <p className="mt-6 font-mono text-xs text-zinc-400 tracking-wider">
          <span className="inline-block w-2 h-2 rounded-full bg-[#D4A017] mr-2 align-middle" />
          <SpotsCounter remaining={foundingSpotsRemaining} className="vibe-gold font-semibold" />{' '}
          of {FOUNDING_TOTAL} founding spots remaining
          <span className="text-zinc-700 mx-2">·</span>
          <span className="tabular-nums">{claimed}</span> claimed
        </p>
      </div>

      {/* scroll hint */}
      <div
        aria-hidden
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-zinc-500"
      >
        <span className="font-mono text-[10px] tracking-[0.2em] uppercase">
          Scroll
        </span>
        <div className="w-px h-10 bg-gradient-to-b from-zinc-500 to-transparent" />
      </div>
    </section>
  );
}
