'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function PublicSiteError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[public-site-error]', error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0A0A0F] px-6 text-center text-white">
      <div className="max-w-md space-y-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">Error</p>
        <h1 className="text-3xl font-bold">Something went wrong</h1>
        <p className="text-sm text-zinc-400">
          This page could not load. Please refresh to try again.
        </p>
        {error.digest ? (
          <p className="font-mono text-[10px] text-zinc-600">Ref: {error.digest}</p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center rounded-md bg-[#D4A017] px-4 py-2 text-sm font-semibold text-[#0A0A0F] hover:bg-[#D4A017]/90"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
