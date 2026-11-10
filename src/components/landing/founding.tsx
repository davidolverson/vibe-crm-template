import Image from 'next/image';
import { WaitlistForm } from './waitlist-form';
import { HoloCard } from './holo-card';
import { Reveal } from './reveal';
import { SpotsCounter } from './spots-counter';
import { FOUNDING_TOTAL } from '@/lib/waitlist';

const perks = [
  {
    label: '60-day free trial',
    detail: '4× the normal 14-day trial. Build the habit before you pay.',
  },
  {
    label: 'Pro features for 6 months',
    detail: 'Any plan unlocks full Pro-tier features for 6 months. Taste the full product.',
  },
  {
    label: '40% off Year 1',
    detail: 'Starter $600 · Pro $900 · Enterprise $1,500 per month.',
  },
  {
    label: '20% off permanently after',
    detail: 'Locked in forever. Starter $800 · Pro $1,200 · Enterprise $2,000 per month.',
  },
  {
    label: 'Direct line to the founder',
    detail: 'Personal onboarding, priority support, feature-request influence.',
  },
];

type FoundingProps = {
  foundingSpotsRemaining: number;
};

export function Founding({ foundingSpotsRemaining }: FoundingProps) {
  const claimed = FOUNDING_TOTAL - foundingSpotsRemaining;
  const pct = Math.max(
    0,
    Math.min(100, Math.round((claimed / FOUNDING_TOTAL) * 100)),
  );

  return (
    <section id="founding" className="vibe-ink relative py-28 px-6">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <div className="mb-12 max-w-2xl">
            <p className="vibe-eyebrow mb-4">Section 06 -- The money</p>
            <h2 className="vibe-headline text-zinc-100 text-[clamp(36px,5vw,72px)]">
              The Founding {FOUNDING_TOTAL}.
            </h2>
            <p className="text-zinc-400 text-lg mt-6 leading-relaxed">
              We&rsquo;re letting {FOUNDING_TOTAL} operators in before anyone
              else. Early access, long trials, locked-in founder pricing, and
              a direct line to the person building this.
            </p>
          </div>
        </Reveal>

        <Reveal delayMs={120}>
          <HoloCard
            className="rounded-3xl border border-[#D4A017]/30"
            style={{
              background:
                'linear-gradient(135deg, rgba(212,160,23,0.10) 0%, rgba(10,10,15,1) 55%, rgba(26,26,46,1) 100%)',
            }}
          >
            {/* Holographic foil backdrop peeks through top band */}
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 h-40 pointer-events-none"
            >
              <Image
                src="/backgrounds/vibe-founding-texture.jpeg"
                alt=""
                fill
                className="object-cover opacity-[0.22]"
                sizes="100vw"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(to bottom, transparent, #0A0A0F 90%)',
                }}
              />
            </div>

            <div className="relative p-10 md:p-14">
              {/* top-right spots counter */}
              <div className="absolute top-8 right-8 flex items-center gap-2 font-mono text-[11px] tracking-wider uppercase text-zinc-400">
                <span className="inline-block w-2 h-2 rounded-full bg-[#D4A017]" />
                <span>
                  <SpotsCounter
                    remaining={foundingSpotsRemaining}
                    className="vibe-gold"
                  />{' '}
                  / {FOUNDING_TOTAL} open
                </span>
              </div>

              {/* progress rail + tick marks */}
              <div className="mb-10 mt-4 max-w-xl">
                <div className="relative h-[6px] rounded-full bg-zinc-900 overflow-hidden border border-zinc-800">
                  <div
                    className="h-full vibe-gold-bg rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    style={{
                      width: `${pct}%`,
                      boxShadow: '0 0 14px rgba(212,160,23,0.55)',
                    }}
                  />
                </div>
                {/* every-10 tick labels */}
                <div className="mt-2 flex justify-between font-mono text-[10px] tracking-wider text-zinc-600">
                  <span>0</span>
                  <span>10</span>
                  <span>20</span>
                  <span>30</span>
                  <span>40</span>
                  <span className="vibe-gold">{FOUNDING_TOTAL}</span>
                </div>
                <p className="mt-3 font-mono text-[11px] tracking-wider uppercase text-zinc-500">
                  <span className="vibe-gold tabular-nums">{claimed}</span>{' '}
                  claimed
                  <span className="text-zinc-700 mx-2">·</span>
                  <span className="tabular-nums">
                    {foundingSpotsRemaining}
                  </span>{' '}
                  remaining
                </p>
              </div>

              <ul className="grid md:grid-cols-2 gap-x-10 gap-y-6 mb-12">
                {perks.map((p) => (
                  <li key={p.label}>
                    <p className="vibe-headline text-xl text-zinc-100 mb-1">
                      {p.label}
                    </p>
                    <p className="text-zinc-400 text-sm leading-relaxed">
                      {p.detail}
                    </p>
                  </li>
                ))}
              </ul>

              <div className="max-w-xl">
                <WaitlistForm
                  context="founding"
                  primaryLabel="Claim my spot"
                  placeholder="founder@example.com"
                  note="No spam. Founding-member confirmation within one business day."
                />
              </div>
            </div>
          </HoloCard>
        </Reveal>
      </div>
    </section>
  );
}
