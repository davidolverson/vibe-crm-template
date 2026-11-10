import {
  Globe,
  GitMerge,
  Zap,
  PhoneCall,
  LayoutGrid,
  TrendingUp,
} from 'lucide-react';
import { Reveal } from './reveal';

type Step = {
  num: string;
  title: string;
  italic: string;
  body: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  metric?: string;
};

const steps: Step[] = [
  {
    num: '01',
    title: 'Lead hits your site.',
    italic: 'Every source captured.',
    body: 'Authority site, campaign page, social form, Facebook lead ad -- UTM-tracked, deduped on entry, routed to the right pipeline.',
    icon: Globe,
  },
  {
    num: '02',
    title: 'Auto-deduplicated.',
    italic: 'One contact, zero noise.',
    body: 'Cross-vertical fuzzy match on email and phone. The same John Smith never shows up three times across RE, mortgage, and insurance.',
    icon: GitMerge,
  },
  {
    num: '03',
    title: 'Assigned in under 30 seconds.',
    italic: 'Speed-to-lead is the game.',
    body: 'Round-robin or rules-based routing. Pager fires to the right agent with full UTM context and source attribution attached.',
    icon: Zap,
    metric: '< 30s',
  },
  {
    num: '04',
    title: 'Agent contacts via VIBE.',
    italic: 'Call, text, email, auto-logged.',
    body: 'Native Twilio voice and SMS. Postmark email templates. Every touchpoint lands on the contact timeline without copy-paste.',
    icon: PhoneCall,
  },
  {
    num: '05',
    title: 'Deal moves through pipeline.',
    italic: 'Kanban everyone shares.',
    body: 'Drag cards across stages. Owner dashboard updates in realtime. Team knows who owns what, at what stage, for how long.',
    icon: LayoutGrid,
  },
  {
    num: '06',
    title: 'Revenue syncs to QuickBooks.',
    italic: 'CFO sees it the hour it closes.',
    body: 'Hourly two-way sync. GCI by source, agent, and business line. Your bookkeeper stops asking for revenue numbers.',
    icon: TrendingUp,
  },
];

export function HowItWorks() {
  return (
    <section className="vibe-ink relative py-28 px-6 overflow-hidden">
      <div className="max-w-5xl mx-auto">
        <Reveal>
          <div className="mb-16 max-w-2xl">
            <p className="vibe-eyebrow mb-4">Section 05 -- How it works</p>
            <h2 className="vibe-headline text-zinc-100 text-[clamp(32px,4.5vw,56px)]">
              From lead to close.
              <br />
              <span className="vibe-gold italic">One platform.</span>
            </h2>
          </div>
        </Reveal>

        <ol className="relative">
          {/* gold rail */}
          <span
            aria-hidden
            className="absolute left-[27px] top-2 bottom-2 w-px bg-gradient-to-b from-[#D4A017]/60 via-[#D4A017]/20 to-transparent"
          />

          {steps.map(({ num, title, italic, body, icon: Icon, metric }, i) => (
            <Reveal key={num} delayMs={i * 90}>
              <li className="relative flex gap-6 pb-10 last:pb-0">
                {/* node marker */}
                <div className="relative z-10 flex-shrink-0 w-14 h-14 rounded-full border border-[#D4A017]/40 bg-[#14141D] flex items-center justify-center">
                  <Icon
                    className="w-5 h-5 vibe-gold"
                    strokeWidth={1.5}
                  />
                </div>

                {/* content */}
                <div className="flex-1 pt-1">
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="font-mono text-[11px] tracking-wider text-zinc-600">
                      {num}
                    </span>
                    {metric ? (
                      <span className="font-mono text-[11px] tracking-wider uppercase vibe-gold">
                        {metric}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="vibe-headline text-2xl md:text-3xl text-zinc-100 mb-1">
                    {title}
                  </h3>
                  <p className="vibe-headline italic vibe-gold text-lg mb-3">
                    {italic}
                  </p>
                  <p className="text-zinc-400 leading-relaxed max-w-xl">
                    {body}
                  </p>
                </div>
              </li>
            </Reveal>
          ))}
        </ol>

        <hr className="vibe-hairline mt-16" />
      </div>
    </section>
  );
}
