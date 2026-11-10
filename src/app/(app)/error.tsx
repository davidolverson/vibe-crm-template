'use client';

import { useEffect } from 'react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AppError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log to error reporting service in production
    console.error('[AppError]', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      {/* Icon */}
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 border border-destructive/20">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-destructive"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
          />
        </svg>
      </div>

      {/* Heading */}
      <h1 className="text-xl font-bold text-foreground mb-2">
        Something went wrong
      </h1>

      {/* Error message -- generic in production to avoid leaking internal details */}
      <p className="text-sm text-muted-foreground max-w-md mb-1">
        {process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred. Our team has been notified.'
          : error.message ?? 'An unexpected error occurred. Please try again.'}
      </p>

      {/* Digest for support reference */}
      {error.digest != null && (
        <p className="text-xs text-muted-foreground/60 mb-6 font-mono">
          Error ID: {error.digest}
        </p>
      )}

      {error.digest == null && <div className="mb-6" />}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center justify-center rounded-md bg-[#D4A017] px-5 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A017] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Try Again
        </button>

        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-md border border-border bg-card px-5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
