'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const origin = window.location.origin;
      const result = await authClient.requestPasswordReset({
        email,
        redirectTo: `${origin}/reset-password`,
      });
      if (result.error) {
        const msg = result.error.message ?? "We couldn't send the reset link.";
        setError(msg);
        toast.error(msg);
      } else {
        setSent(true);
      }
    } catch {
      const msg = 'Something went wrong on our end. Try again in a moment.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <>
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-[#8A817A]">
          Check your inbox
        </p>
        <h1 className="font-display text-[30px] font-[500] leading-[1.1] tracking-[-0.01em] text-[#1A1512]">
          Key&apos;s on its way.
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-[#5C554E]">
          If an account exists for <span className="text-[#1A1512]">{email}</span>, we sent a reset link. It expires in one hour.
        </p>
        <div className="mt-6 rounded-[2px] border border-[#D4A017]/20 bg-[#FAF6EC] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.2em] text-[#8A817A]">
          Not there? Check spam, or{' '}
          <button
            type="button"
            onClick={() => setSent(false)}
            className="text-[#8B6914] hover:text-[#D4A017] transition-colors"
          >
            try another email
          </button>
          .
        </div>
        <div className="mt-7 border-t border-[#D4A017]/20 pt-5">
          <Link
            href="/sign-in"
            className="block text-center font-mono text-[11px] uppercase tracking-[0.2em] text-[#8B6914] hover:text-[#D4A017] transition-colors"
          >
            ← Back to sign in
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-[#8A817A]">
        Reset
      </p>
      <h1 className="font-display text-[32px] font-[500] leading-[1.05] tracking-[-0.01em] text-[#1A1512]">
        Misplaced your key.
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[#5C554E]">
        Drop your email. We&apos;ll cut a new one.
      </p>

      <form onSubmit={handleSubmit} className="mt-7 space-y-5">
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.3em] text-[#5C554E]"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus
            placeholder="you@example.com"
            className="block w-full rounded-[2px] border-0 border-b border-[#C9BFA8] bg-transparent px-0 py-2.5 text-[15px] text-[#1A1512] placeholder:text-[#A89E85] focus:border-[#D4A017] focus:outline-none focus:ring-0 transition-colors"
          />
        </div>

        {error && (
          <p className="rounded-[2px] border border-[#8B2A14]/30 bg-[#FBEEE8] px-3 py-2 text-[13px] text-[#6B1F0E]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-[2px] bg-[#1A1512] px-4 py-3.5 text-[13px] font-[500] uppercase tracking-[0.25em] text-[#F5F1EA] transition-colors hover:bg-[#D4A017] hover:text-[#1A1512] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Cutting key…' : 'Send new key'}
        </button>
      </form>

      <div className="mt-7 border-t border-[#D4A017]/20 pt-5">
        <Link
          href="/sign-in"
          className="block text-center font-mono text-[11px] uppercase tracking-[0.2em] text-[#8B6914] hover:text-[#D4A017] transition-colors"
        >
          ← Back to sign in
        </Link>
      </div>
    </>
  );
}
