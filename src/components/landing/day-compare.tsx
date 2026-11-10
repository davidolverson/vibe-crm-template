import { Reveal } from './reveal';

type Row = {
  time: string;
  without: string;
  with: string;
};

const rows: Row[] = [
  {
    time: '6:00 AM',
    without: 'Check three inboxes for overnight leads.',
    with: 'All overnight leads auto-assigned before you wake up.',
  },
  {
    time: '7:30 AM',
    without: 'Copy leads from email into a spreadsheet.',
    with: 'Open VIBE. Everything is already there.',
  },
  {
    time: '9:00 AM',
    without: 'Log into Follow Up Boss, then LionDesk, then QuickBooks.',
    with: 'One login. One dashboard. Every business line.',
  },
  {
    time: '11:00 AM',
    without: 'Realize a lead from Tuesday was never contacted.',
    with: 'Auto-sequence already sent three touchpoints.',
  },
  {
    time: '3:00 PM',
    without: 'Bookkeeper asks for revenue numbers. Scramble.',
    with: 'CFO dashboard. One click. QuickBooks-synced hourly.',
  },
  {
    time: '5:00 PM',
    without: 'Exhausted from tool-juggling. Still behind.',
    with: 'Closed two deals. Left early.',
  },
];

export function DayCompare() {
  return (
    <section className="vibe-bone text-zinc-900 relative py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <div className="mb-12 max-w-2xl">
            <p
              className="vibe-eyebrow mb-4"
              style={{ color: '#8C6A0F' }}
            >
              Section 07 -- A day in the life
            </p>
            <h2 className="vibe-headline text-[clamp(32px,4.5vw,56px)]">
              Six hours you&rsquo;ll never get back.
              <br />
              <span style={{ color: '#8C6A0F' }} className="italic">
                Or you won&rsquo;t.
              </span>
            </h2>
            <p className="text-zinc-600 text-lg mt-6 leading-relaxed">
              The left column is what a Tuesday looks like stitched across
              four disconnected tools. The right column is the same Tuesday
              on VIBE.
            </p>
          </div>
        </Reveal>

        {/* Headers -- desktop only */}
        <div className="hidden md:grid grid-cols-[80px_1fr_1fr] gap-0 mb-4">
          <div />
          <div className="px-6">
            <p className="font-mono text-[11px] tracking-wider uppercase text-zinc-400 mb-1">
              Without VIBE
            </p>
            <p className="vibe-headline text-2xl text-zinc-500">Chaos.</p>
          </div>
          <div className="px-6 border-l-2 border-[#D4A017]/30">
            <p className="font-mono text-[11px] tracking-wider uppercase vibe-gold mb-1">
              With VIBE
            </p>
            <p className="vibe-headline text-2xl text-zinc-900">
              <span className="italic">Command.</span>
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
          {rows.map((row, i) => (
            <Reveal key={row.time} delayMs={i * 50}>
              <div className="grid grid-cols-1 md:grid-cols-[80px_1fr_1fr] border-b border-zinc-100 last:border-b-0">
                {/* Time column */}
                <div className="px-6 md:px-4 py-4 md:py-6 bg-zinc-50 md:bg-white border-r-0 md:border-r border-zinc-100 flex items-center">
                  <span className="font-mono text-xs tracking-wider text-zinc-500 tabular-nums">
                    {row.time}
                  </span>
                </div>

                {/* Without -- mobile label + content */}
                <div className="px-6 py-4 md:py-6 bg-white">
                  <p className="md:hidden font-mono text-[10px] tracking-wider uppercase text-zinc-400 mb-1">
                    Without VIBE
                  </p>
                  <p className="text-zinc-500 leading-relaxed line-through decoration-zinc-300">
                    {row.without}
                  </p>
                </div>

                {/* With -- mobile label + content */}
                <div
                  className="px-6 py-4 md:py-6 border-l-2 border-[#D4A017]/30"
                  style={{ background: 'rgba(212, 160, 23, 0.05)' }}
                >
                  <p className="md:hidden font-mono text-[10px] tracking-wider uppercase vibe-gold mb-1">
                    With VIBE
                  </p>
                  <p className="text-zinc-900 leading-relaxed font-medium">
                    {row.with}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delayMs={rows.length * 50 + 80}>
          <p className="mt-10 font-mono text-xs tracking-wider uppercase text-zinc-500 text-center">
            Same operator. Same deals.{' '}
            <span className="vibe-gold">Three hours saved.</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
