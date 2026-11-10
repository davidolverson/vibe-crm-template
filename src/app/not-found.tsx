import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] flex flex-col items-center justify-center px-4 text-center">
      <span className="text-6xl font-bold text-[#D4A017] mb-4">404</span>
      <h1 className="text-2xl font-semibold text-white mb-2">Page not found</h1>
      <p className="text-zinc-400 mb-8">That page does not exist or has been moved.</p>
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Link
          href="/"
          className="px-6 py-2.5 rounded-lg bg-[#D4A017] text-[#0A0A0F] font-bold hover:bg-[#D4A017]/90 transition-colors"
        >
          Back to home
        </Link>
        <Link
          href="/pricing"
          className="px-6 py-2.5 rounded-lg border border-zinc-700 text-zinc-300 font-medium hover:border-[#D4A017] hover:text-[#D4A017] transition-colors"
        >
          View pricing
        </Link>
      </div>
    </div>
  );
}
