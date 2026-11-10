import { WaitlistForm } from './waitlist-form';
import { Reveal } from './reveal';

export function FinalCTA() {
  return (
    <section className="vibe-ink relative py-32 px-6 overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-[0.08]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #D4A017 1px, transparent 1px)',
          backgroundSize: '120px 100%',
        }}
      />
      <div className="relative max-w-3xl mx-auto text-center">
        <Reveal>
          <p className="vibe-eyebrow mb-6">Section 08 -- Final call</p>
          <h2 className="vibe-headline text-zinc-100 text-[clamp(36px,6vw,80px)] mb-6">
            The next age of real estate
            <br />
            <span className="vibe-gold italic">is loading.</span>
          </h2>
          <p className="text-zinc-400 text-lg mb-10">
            VIBE is live and the Founding 50 is open. Claim one of the first 50
            seats, lock founder pricing, and get a direct line to the builder.
          </p>
        </Reveal>

        <Reveal delayMs={120}>
          <div className="max-w-xl mx-auto">
            <WaitlistForm
              context="final"
              primaryLabel="Claim my founding spot"
              note="No spam. Founding-member confirmation within one business day."
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
