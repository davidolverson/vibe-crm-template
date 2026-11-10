import Link from 'next/link';
import { Wordmark } from './wordmark';

export function LandingNav() {
  return (
    <nav className="absolute top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/" aria-label="VIBE home">
          <Wordmark size="sm" />
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link
            href="#what-vibe-solves"
            className="text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            Product
          </Link>
          <Link
            href="#battlefield"
            className="text-zinc-400 hover:text-zinc-100 transition-colors hidden sm:inline"
          >
            Compare
          </Link>
          <Link
            href="#founding"
            className="text-zinc-400 hover:text-zinc-100 transition-colors hidden sm:inline"
          >
            Founding 50
          </Link>
          <Link
            href="/sign-in"
            className="text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </nav>
  );
}
