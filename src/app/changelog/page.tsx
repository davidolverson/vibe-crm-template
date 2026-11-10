import type { Metadata } from 'next';
import { LandingNav } from '@/components/landing/nav';
import { LandingFooter } from '@/components/landing/footer';
import { loadChangelog, type Block, type InlineToken } from '@/lib/changelog';

export const revalidate = 3600; // 1h ISR -- pulls fresh content_log.md on every new deploy

export const metadata: Metadata = {
  title: 'Changelog',
  description:
    'Every ship, every week. Public build-in-public log of VIBE -- the CRM for vertically integrated real estate operators.',
  openGraph: {
    title: 'Changelog -- VIBE',
    description: 'Every ship, every week. Public build-in-public log of VIBE.',
    url: 'https://example.com/changelog',
    type: 'website',
  },
};

function Inline({ tokens }: { tokens: InlineToken[] }) {
  return (
    <>
      {tokens.map((t, i) => {
        if (t.type === 'strong') {
          return (
            <strong key={i} className="text-zinc-100 font-semibold">
              {t.value}
            </strong>
          );
        }
        if (t.type === 'code') {
          return (
            <code
              key={i}
              className="rounded bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 text-[0.9em] text-[#D4A017] font-mono"
            >
              {t.value}
            </code>
          );
        }
        if (t.type === 'link') {
          // Only allow http, https, mailto, and same-origin relative links.
          const safeHref = /^(https?:\/\/|mailto:|\/|#)/.test(t.href) ? t.href : '#';
          const external = /^https?:\/\//.test(safeHref);
          return (
            <a
              key={i}
              href={safeHref}
              className="text-[#D4A017] underline decoration-[#D4A017]/40 hover:decoration-[#D4A017] underline-offset-2"
              {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              {t.value}
            </a>
          );
        }
        return <span key={i}>{t.value}</span>;
      })}
    </>
  );
}

function BlockView({ block }: { block: Block }) {
  if (block.type === 'h3') {
    return (
      <h3 className="mt-6 mb-2 text-zinc-300 font-display text-[15px] font-medium tracking-tight">
        <Inline tokens={block.inlines} />
      </h3>
    );
  }
  if (block.type === 'p') {
    return (
      <p className="text-zinc-400 leading-relaxed">
        <Inline tokens={block.inlines} />
      </p>
    );
  }
  return (
    <ul className="space-y-2 text-zinc-400 leading-relaxed list-disc list-outside pl-5 marker:text-zinc-600">
      {block.items.map((item, i) => (
        <li key={i}>
          <Inline tokens={item} />
        </li>
      ))}
    </ul>
  );
}

function formatDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export default async function ChangelogPage() {
  const entries = await loadChangelog();

  return (
    <>
      <LandingNav />
      <main className="vibe-ink min-h-screen pt-32 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="vibe-eyebrow mb-4">VIBE · CHANGELOG</p>
          <h1 className="vibe-headline text-zinc-100 text-[clamp(40px,6vw,72px)] mb-4">
            Every ship, every week.
          </h1>
          <p className="text-zinc-400 mb-14 max-w-xl leading-relaxed">
            This is the public build log. Every entry below is a real commit or deploy -- no
            hand-wavy roadmap, no &ldquo;coming soon.&rdquo; If it&rsquo;s here, it shipped.
          </p>

          <div className="space-y-14">
            {entries.length === 0 && (
              <p className="text-zinc-500 font-mono text-sm">No entries yet.</p>
            )}

            {entries.map((entry) => (
              <article
                key={entry.slug}
                id={entry.slug}
                className="border-l-2 border-zinc-800 pl-6 hover:border-[#D4A017]/50 transition-colors"
              >
                <header className="mb-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#D4A017] mb-2">
                    {formatDate(entry.date)}
                  </p>
                  <h2 className="text-zinc-100 font-display text-[22px] sm:text-[26px] font-medium leading-tight tracking-tight">
                    {entry.title}
                  </h2>
                </header>
                <div className="space-y-3">
                  {entry.blocks.map((b, i) => (
                    <BlockView key={i} block={b} />
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>
      <LandingFooter />
    </>
  );
}
