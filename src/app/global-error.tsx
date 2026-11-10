'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

// Root error boundary. Fires when a layout at or above the (app) / (auth) /
// (admin) group throws. Must render its own <html> + <body>.
export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('[global-error]', error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen items-center justify-center bg-[#0A0A0F] px-6 text-center text-white">
        <div className="max-w-md space-y-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">VIBE</p>
          <h1 className="text-3xl font-bold">Something broke.</h1>
          <p className="text-sm text-zinc-400">
            The application hit an unexpected error. Refresh to try again, or head back to the
            homepage.
          </p>
          {error.digest ? (
            <p className="font-mono text-[10px] text-zinc-600">Ref: {error.digest}</p>
          ) : null}
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center rounded-md bg-[#D4A017] px-4 py-2 text-sm font-semibold text-[#0A0A0F] hover:bg-[#D4A017]/90"
            >
              Try again
            </button>
            {/*
             * global-error renders OUTSIDE the Next.js layout tree, so the
             * router context that next/link relies on isn't available here.
             * <a> is the correct primitive in this boundary; suppress the
             * eslint hint that doesn't understand the special case.
             */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              className="inline-flex items-center rounded-md border border-zinc-800 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-700"
            >
              Homepage
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
