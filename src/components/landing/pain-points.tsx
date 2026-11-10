import { Reveal } from './reveal';

const quotes = [
  {
    text: "I'm paying $400/mo for Follow Up Boss and still using spreadsheets for my mortgage leads.",
    source: 'Sample post',
    count: 52,
  },
  {
    text: 'Why can\'t any CRM handle both my real estate AND insurance business?',
    source: 'Sample post',
    count: 31,
  },
  {
    text: 'I have four logins for four tools. Leads fall through the cracks daily.',
    source: 'Sample post',
    count: 47,
  },
  {
    text: "My bookkeeper and my CRM don't talk. I'm the middleware.",
    source: 'Sample post',
    count: 23,
  },
  {
    text: 'Spent $2,000 on CINC last month. Half my leads never got contacted.',
    source: 'Sample post',
    count: 39,
  },
  {
    text: 'Every tool switch costs me two weeks of momentum and half my data.',
    source: 'Sample post',
    count: 29,
  },
];

export function PainPoints() {
  return (
    <section className="vibe-ink relative py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <div className="mb-16 max-w-2xl">
            <p className="vibe-eyebrow mb-4">Section 02 -- The problem</p>
            <h2 className="vibe-headline text-zinc-100 text-[clamp(32px,4.5vw,56px)]">
              The market already said it.
              <br />
              <span className="text-zinc-500 italic">We just listened.</span>
            </h2>
          </div>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quotes.map((q, i) => (
            <Reveal key={i} delayMs={i * 60}>
            <figure
              className="rounded-xl border border-zinc-800/80 bg-[#14141D] p-6 hover:border-[#D4A017]/40 transition-colors duration-300"
              style={{
                transform: `translateY(${(i % 3) * 8}px)`,
              }}
            >
              <blockquote className="text-zinc-300 text-base leading-relaxed font-normal">
                <span className="vibe-gold text-2xl font-serif leading-none mr-1 align-top">
                  &ldquo;
                </span>
                {q.text}
              </blockquote>
              <figcaption className="mt-5 flex items-center justify-between font-mono text-[11px] tracking-wider uppercase text-zinc-500">
                <span>{q.source}</span>
                <span className="tabular-nums">
                  <span className="vibe-gold">↑</span> {q.count}
                </span>
              </figcaption>
            </figure>
            </Reveal>
          ))}
        </div>

        <p className="mt-12 text-center font-mono text-xs tracking-wider uppercase text-zinc-500">
          <span className="vibe-gold tabular-nums">462</span> real estate
          professionals posted about these problems this month.
        </p>

        <hr className="vibe-hairline mt-16" />
      </div>
    </section>
  );
}
