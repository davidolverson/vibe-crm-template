import { Users, Globe, LineChart, Radio } from 'lucide-react';
import { Reveal } from './reveal';
import { TiltCard } from './tilt-card';

const pillars = [
  {
    icon: Users,
    headline: 'Unified leads.',
    italic: 'One contact, every business line.',
    body:
      'Real estate, mortgage, insurance, investing -- one timeline, zero duplicates. Cross-vertical dedup no other CRM does.',
  },
  {
    icon: Globe,
    headline: 'Multi-site capture.',
    italic: 'Every site feeds one engine.',
    body:
      'Authority sites, campaign pages, landing pages, social forms -- all leads flow to the same CRM with full UTM attribution.',
  },
  {
    icon: LineChart,
    headline: 'Owner dashboards.',
    italic: 'CEO view. CFO view. One login.',
    body:
      'Pipeline health plus QuickBooks-synced financials across every entity. Revenue by source, by agent, by business line.',
  },
  {
    icon: Radio,
    headline: 'Communication hub.',
    italic: 'Call. Text. Email. One place.',
    body:
      'Twilio-powered voice and SMS. Postmark email with drip sequences. Every touch auto-logged to the contact timeline.',
  },
];

export function Solves() {
  return (
    <section id="what-vibe-solves" className="vibe-graphite relative py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <div className="mb-16 max-w-2xl">
            <p className="vibe-eyebrow mb-4">Section 03 -- What VIBE solves</p>
            <h2 className="vibe-headline text-zinc-100 text-[clamp(32px,4.5vw,56px)]">
              Four pillars.
              <br />
              <span className="vibe-gold italic">One platform.</span>
            </h2>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-2 gap-6">
          {pillars.map(({ icon: Icon, headline, italic, body }, i) => (
            <Reveal key={i} delayMs={i * 90}>
              <TiltCard className="h-full">
                <article className="group relative h-full rounded-2xl border border-zinc-800 bg-[#0A0A0F] p-8 hover:border-[#D4A017]/50 transition-colors duration-500">
                  {/* pillar number */}
                  <span className="absolute top-6 right-6 font-mono text-[11px] tracking-wider text-zinc-600">
                    0{i + 1}
                  </span>

                  <div className="mb-6 inline-flex items-center justify-center w-12 h-12 rounded-xl border border-zinc-800 bg-[#14141D] group-hover:border-[#D4A017]/60 group-hover:bg-[#D4A017]/10 transition-colors duration-500">
                    <Icon className="w-5 h-5 vibe-gold" strokeWidth={1.5} />
                  </div>

                  <h3 className="vibe-headline text-3xl text-zinc-100 mb-1">
                    {headline}
                  </h3>
                  <p className="vibe-headline italic vibe-gold text-xl mb-5">
                    {italic}
                  </p>
                  <p className="text-zinc-400 leading-relaxed">{body}</p>
                </article>
              </TiltCard>
            </Reveal>
          ))}
        </div>

        <hr className="vibe-hairline mt-20" />
      </div>
    </section>
  );
}
