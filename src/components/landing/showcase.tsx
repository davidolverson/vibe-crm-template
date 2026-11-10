import Image from 'next/image';
import { Reveal } from './reveal';

export function Showcase() {
  return (
    <section className="vibe-graphite relative py-28 px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <div className="mb-14 max-w-2xl">
            <p className="vibe-eyebrow mb-4">Section 05 -- Inside the workspace</p>
            <h2 className="vibe-headline text-zinc-100 text-[clamp(32px,4.5vw,56px)]">
              Every surface is yours.
              <br />
              <span className="vibe-gold italic">Pipeline, revenue, timeline.</span>
            </h2>
            <p className="text-zinc-400 text-lg mt-6 leading-relaxed">
              Kanban board for the deal flow. Live revenue sync under the curve.
              A unified contact timeline where calls, emails, SMS, and deal
              movement land in the same thread.
            </p>
          </div>
        </Reveal>

        <Reveal delayMs={120}>
          <div className="relative rounded-3xl border border-zinc-800 bg-[#0A0A0F] overflow-hidden">
            <Image
              src="/backgrounds/vibe-dashboard-composite.jpeg"
              alt="Composite view of the VIBE workspace: pipeline kanban, revenue chart, and contact timeline connected by gold data threads."
              width={2048}
              height={1152}
              className="w-full h-auto"
              sizes="(max-width: 1200px) 100vw, 1200px"
            />
            {/* Feather edges into ink */}
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse 100% 100% at 50% 50%, transparent 55%, rgba(20,20,29,0.85) 100%)',
              }}
            />
          </div>
        </Reveal>

        <Reveal delayMs={260}>
          <div className="mt-10 grid sm:grid-cols-3 gap-4 text-sm">
            {[
              { label: 'Kanban', detail: 'Drag-to-move deal cards across every stage you configure.' },
              { label: 'Revenue sync', detail: 'Hourly QuickBooks pull. GCI by source, agent, and business line.' },
              { label: 'Timeline', detail: 'Every touchpoint logged. No context lost between agent and admin.' },
            ].map((f) => (
              <div
                key={f.label}
                className="rounded-xl border border-zinc-800 bg-[#14141D] p-5"
              >
                <p className="font-mono text-[11px] tracking-wider uppercase vibe-gold mb-2">
                  {f.label}
                </p>
                <p className="text-zinc-300 leading-snug">{f.detail}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <hr className="vibe-hairline mt-20" />
      </div>
    </section>
  );
}
