import { Reveal } from './reveal';

type Message =
  | {
      kind: 'user';
      name: string;
      initial: string;
      source: string;
      text: string;
      reactions: { emoji: string; count: number }[];
    }
  | {
      kind: 'vibe';
      text: string;
      proof?: string;
    };

const thread: Message[] = [
  {
    kind: 'user',
    name: 'Agent A',
    initial: 'A',
    source: 'Sample post',
    text: "I'm the middleware between my CRM and my bookkeeper. End of week is a nightmare.",
    reactions: [
      { emoji: '😤', count: 47 },
      { emoji: '💯', count: 23 },
    ],
  },
  {
    kind: 'vibe',
    text: 'VIBE syncs QuickBooks hourly. Your bookkeeper sees deals the hour they close.',
    proof: 'Hourly QBO sync · Active since V1.5',
  },
  {
    kind: 'user',
    name: 'Agent B',
    initial: 'B',
    source: 'Sample post',
    text: "Why can't one tool handle my real estate AND mortgage AND insurance business?",
    reactions: [
      { emoji: '🙋', count: 31 },
      { emoji: '🔥', count: 18 },
    ],
  },
  {
    kind: 'vibe',
    text: 'That is literally what VIBE was built for. One contact record, every business line, cross-sell attribution included.',
    proof: 'Cross-vertical dedup · unified pipelines',
  },
  {
    kind: 'user',
    name: 'Agent C',
    initial: 'C',
    source: 'Sample post',
    text: "I'm paying $400/mo for Follow Up Boss and still using spreadsheets for my mortgage leads.",
    reactions: [
      { emoji: '😩', count: 52 },
      { emoji: '🫠', count: 29 },
    ],
  },
  {
    kind: 'vibe',
    text: "Founding members get everything -- RE, mortgage, insurance, QBO, multi-site -- from $600/mo. No spreadsheets. We locked it in forever.",
    proof: 'Founding 50 · 40% off Year 1',
  },
];

export function VoiceOfMarket() {
  return (
    <section className="vibe-bone text-zinc-900 relative py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <Reveal>
          <div className="mb-12 max-w-xl">
            <p
              className="vibe-eyebrow mb-4"
              style={{ color: '#8C6A0F' }}
            >
              Section 06 -- Voice of the market
            </p>
            <h2 className="vibe-headline text-[clamp(32px,4.5vw,56px)]">
              We didn&rsquo;t make this up.
              <br />
              <span style={{ color: '#8C6A0F' }} className="italic">
                You said it.
              </span>
            </h2>
          </div>
        </Reveal>

        <div className="rounded-3xl border border-zinc-200 bg-white p-4 sm:p-6 shadow-[0_20px_60px_-30px_rgba(9,9,11,0.18)]">
          {/* fake chat header */}
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-[#D4A017]" />
              <span className="font-mono text-[11px] tracking-wider uppercase text-zinc-500">
                #real-estate-operators
              </span>
            </div>
            <span className="font-mono text-[11px] tracking-wider uppercase text-zinc-400">
              3 replies from VIBE
            </span>
          </div>

          <ul className="space-y-5">
            {thread.map((m, i) => (
              <Reveal key={i} delayMs={i * 80}>
                {m.kind === 'user' ? (
                  <li className="flex gap-3 items-start">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-zinc-200 text-zinc-700 flex items-center justify-center font-semibold">
                      {m.initial}
                    </div>
                    <div className="flex-1 max-w-md">
                      <div className="flex items-baseline gap-3 mb-1">
                        <span className="font-semibold text-sm text-zinc-900">
                          {m.name}
                        </span>
                        <span className="font-mono text-[10px] tracking-wider uppercase text-zinc-400">
                          {m.source}
                        </span>
                      </div>
                      <div className="bg-zinc-100 rounded-2xl rounded-tl-sm px-4 py-3 text-zinc-800 leading-relaxed">
                        {m.text}
                      </div>
                      <div className="flex gap-2 mt-2">
                        {m.reactions.map((r, j) => (
                          <span
                            key={j}
                            className="inline-flex items-center gap-1 text-xs text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-full px-2 py-0.5"
                          >
                            <span>{r.emoji}</span>
                            <span className="tabular-nums">{r.count}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </li>
                ) : (
                  <li className="flex gap-3 items-start justify-end">
                    <div className="flex-1 max-w-md flex flex-col items-end">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-mono text-[10px] tracking-wider uppercase vibe-gold">
                          VIBE · bot
                        </span>
                        <span className="font-semibold text-sm text-zinc-900">
                          replied
                        </span>
                      </div>
                      <div
                        className="rounded-2xl rounded-tr-sm px-4 py-3 text-zinc-900 leading-relaxed"
                        style={{
                          background:
                            'linear-gradient(135deg, rgba(212,160,23,0.16), rgba(212,160,23,0.08))',
                          border: '1px solid rgba(212,160,23,0.35)',
                        }}
                      >
                        {m.text}
                      </div>
                      {m.proof ? (
                        <p className="mt-2 font-mono text-[10px] tracking-wider uppercase text-zinc-500">
                          ✦ {m.proof}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex-shrink-0 w-10 h-10 rounded-full vibe-gold-bg text-[#0A0A0F] flex items-center justify-center font-bold font-serif">
                      V
                    </div>
                  </li>
                )}
              </Reveal>
            ))}
          </ul>
        </div>

        <Reveal delayMs={thread.length * 80 + 100}>
          <p className="mt-8 text-center font-mono text-xs tracking-wider uppercase text-zinc-500">
            Illustrative quotes.{' '}
            <span className="vibe-gold">Every reply is a live feature.</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
