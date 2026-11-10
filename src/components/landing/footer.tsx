import Link from 'next/link';
import { Wordmark } from './wordmark';

export function LandingFooter() {
  return (
    <footer className="vibe-ink border-t border-zinc-900 py-12 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-end md:justify-between gap-8">
        <div>
          <Wordmark size="sm" showAcronym />
          <p className="mt-6 text-zinc-500 text-sm max-w-xs leading-relaxed">
            CRM for vertically integrated real estate operators. Now live.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 text-sm text-zinc-400">
          <Link href="/pricing" className="hover:text-zinc-100 transition-colors">
            Pricing
          </Link>
          <Link href="/changelog" className="hover:text-zinc-100 transition-colors">
            Changelog
          </Link>
          <Link
            href="/sign-in"
            className="hover:text-zinc-100 transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/privacy"
            className="hover:text-zinc-100 transition-colors"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="hover:text-zinc-100 transition-colors"
          >
            Terms
          </Link>
          <Link
            href="/contact"
            className="hover:text-zinc-100 transition-colors"
          >
            Contact
          </Link>
        </div>
      </div>

      <p className="max-w-6xl mx-auto mt-10 font-mono text-[11px] tracking-wider uppercase text-zinc-700">
        © 2026 VIBE · example.com · Powered by ModernGrindTech
      </p>
    </footer>
  );
}
