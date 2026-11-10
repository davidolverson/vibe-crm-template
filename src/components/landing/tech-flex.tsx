const stack = [
  { name: 'Next.js', role: 'React framework, server-first' },
  { name: 'Prisma', role: 'Type-safe database layer' },
  { name: 'Neon', role: 'Serverless Postgres, branches like git' },
  { name: 'Better Auth', role: 'Multi-tenant auth with organizations' },
  { name: 'Stripe', role: 'Per-entity subscriptions and billing' },
  { name: 'Twilio', role: 'SMS, calls, full logging' },
  { name: 'Postmark', role: '99%+ deliverability transactional email' },
  { name: 'QuickBooks', role: 'Hourly financial sync for CFO dashboards' },
];

export function TechFlex() {
  return (
    <section className="vibe-ink relative py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-14 max-w-2xl">
          <p className="vibe-eyebrow mb-4">Section 07 -- Built different</p>
          <h2 className="vibe-headline text-zinc-100 text-[clamp(32px,4.5vw,56px)]">
            Built different.
            <br />
            <span className="vibe-gold italic">Literally.</span>
          </h2>
          <p className="text-zinc-400 text-lg mt-6 leading-relaxed">
            No wrappers over wrappers. Every layer is modern, typed, and
            observable.
          </p>
        </div>

        <ul className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
          {stack.map((s) => (
            <li
              key={s.name}
              className="rounded-xl border border-zinc-800 bg-[#14141D] p-5 hover:border-[#D4A017]/40 transition-colors"
            >
              <p className="font-mono text-[11px] tracking-wider uppercase text-zinc-500 mb-2">
                {s.name}
              </p>
              <p className="text-zinc-300 text-sm leading-snug">{s.role}</p>
            </li>
          ))}
        </ul>

        <hr className="vibe-hairline mt-16" />
      </div>
    </section>
  );
}
