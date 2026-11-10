import type { ReactNode } from 'react';
import { LandingNav } from './nav';
import { LandingFooter } from './footer';

type LegalShellProps = {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  children: ReactNode;
};

export function LegalShell({
  eyebrow,
  title,
  lastUpdated,
  children,
}: LegalShellProps) {
  return (
    <>
      <LandingNav />
      <main className="vibe-ink min-h-screen pt-32 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="vibe-eyebrow mb-4">{eyebrow}</p>
          <h1 className="vibe-headline text-zinc-100 text-[clamp(40px,6vw,72px)] mb-4">
            {title}
          </h1>
          <p className="font-mono text-xs tracking-wider uppercase text-zinc-500 mb-12">
            Last updated {lastUpdated}
          </p>

          <article className="vibe-legal-prose text-zinc-300 leading-relaxed space-y-6">
            {children}
          </article>
        </div>
      </main>
      <LandingFooter />
    </>
  );
}
