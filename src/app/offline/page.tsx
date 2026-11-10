export const metadata = { title: 'Offline | VIBE', robots: { index: false, follow: false } };

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0A0A0F] px-6 text-center text-white">
      <div className="max-w-md space-y-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">VIBE</p>
        <h1 className="text-3xl font-bold">You&apos;re offline</h1>
        <p className="text-sm text-zinc-400">
          The network is unreachable. Your last-loaded pages are still available -- check your
          connection and retry.
        </p>
        <a
          href="/dashboard"
          className="inline-flex items-center rounded-md bg-[#D4A017] px-4 py-2 text-sm font-semibold text-[#0A0A0F] hover:bg-[#D4A017]/90"
        >
          Try again
        </a>
      </div>
    </main>
  );
}
