import type { Metadata } from 'next';
import Link from 'next/link';
import { LandingNav } from '@/components/landing/nav';
import { LandingFooter } from '@/components/landing/footer';

export const metadata: Metadata = {
  title: 'Checkout cancelled -- VIBE Founding 50',
  description:
    'No charge was made. Your Founding 50 spot is still open if you want to come back.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/founding-50/cancel' },
};

export default function FoundingCancelPage() {
  return (
    <>
      <LandingNav />
      <main className="vibe-ink min-h-[80vh] flex items-center">
        <section className="max-w-2xl mx-auto px-6 py-32 text-center vibe-rise">
          <p className="vibe-eyebrow mb-6">Checkout cancelled</p>
          <h1 className="vibe-headline text-zinc-100 text-[clamp(32px,5vw,56px)] mb-6">
            No charge was made.
          </h1>
          <p className="text-zinc-300 text-lg leading-relaxed mb-10">
            Your Founding 50 seat is still available if you want to come
            back. Questions? Reach{' '}
            <a className="vibe-gold underline" href="mailto:hello@example.com">
              hello@example.com
            </a>
            .
          </p>
          <Link
            href="/founding-50"
            className="inline-block vibe-gold-bg text-[#0A0A0F] vibe-pulse-glow rounded-full px-8 py-4 font-semibold text-base tracking-tight hover:brightness-110 transition-[filter] duration-200"
          >
            Back to Founding 50
          </Link>
        </section>
      </main>
      <LandingFooter />
    </>
  );
}
