import Link from 'next/link';
import Image from 'next/image';

type Props = {
  children: React.ReactNode;
  /** Right-side wordmark caption -- e.g. "Listing Room" or "Opening Hours" */
  caption?: string;
  /** Tiny label beneath the card -- e.g. "No. 01 · Member Entry" */
  footnote?: string;
};

export function ListingRoomShell({
  children,
  caption = 'Listing Room',
  footnote,
}: Props) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0A0908] text-[#F5F1EA]">
      <Image
        src="/backgrounds/vibe-listing-room.jpeg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 72% 55%, rgba(10,9,8,0) 0%, rgba(10,9,8,0.45) 55%, rgba(10,9,8,0.85) 100%)',
        }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[#0A0908]/30" />

      <header className="relative z-20 flex items-center justify-between px-6 pt-8 sm:px-10">
        <Link href="/" className="group inline-flex items-baseline">
          <span
            className="font-display text-[26px] font-semibold tracking-[0.28em] text-[#D4A017] transition-colors group-hover:text-[#E8B437]"
            style={{ fontFeatureSettings: '"ss01"' }}
          >
            VIBE
          </span>
        </Link>
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.32em] text-[#8A817A] sm:inline">
          Est. MMXXVI · {caption}
        </span>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100svh-64px)] w-full max-w-[1400px] items-center justify-start px-6 pb-12 pt-8 sm:px-10">
        <div className="w-full max-w-[440px]">
          <div className="relative rounded-[2px] border border-[#D4A017]/25 bg-[#F5F1EA] px-7 pb-8 pt-6 text-[#1A1512] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7),0_0_0_1px_rgba(212,160,23,0.08)_inset]">
            <div
              aria-hidden
              className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#D4A017] to-transparent"
            />
            {children}
          </div>
          {footnote && (
            <p className="mt-5 pl-1 font-mono text-[10px] uppercase tracking-[0.3em] text-[#8A817A]">
              {footnote}
            </p>
          )}
        </div>
      </main>

      <footer className="absolute bottom-4 right-6 z-20 hidden items-center gap-6 font-mono text-[10px] uppercase tracking-[0.25em] text-[#8A817A] sm:flex sm:right-10">
        <span>© MMXXVI</span>
        <Link href="/privacy" className="hover:text-[#D4A017] transition-colors">Privacy</Link>
        <Link href="/terms" className="hover:text-[#D4A017] transition-colors">Terms</Link>
      </footer>
    </div>
  );
}
