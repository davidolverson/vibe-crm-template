'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';

const inputClass =
  'block w-full rounded-[2px] border-0 border-b border-[#C9BFA8] bg-transparent px-0 py-2.5 text-[15px] text-[#1A1512] placeholder:text-[#A89E85] focus:border-[#D4A017] focus:outline-none focus:ring-0 transition-colors';
const labelClass =
  'mb-1.5 block font-mono text-[10px] uppercase tracking-[0.3em] text-[#5C554E]';

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError('This reset link is missing a token. Request a new one.');
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      const result = await authClient.resetPassword({ newPassword: password, token });
      if (result.error) {
        const msg = result.error.message ?? "We couldn't set the new password.";
        setError(msg);
        toast.error(msg);
      } else {
        toast.success('Password updated. Sign in with the new one.');
        router.push('/sign-in');
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Something went wrong on our end. Try again in a moment.';
      console.error('[reset-password]', err);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-[#8A817A]">
        New Key
      </p>
      <h1 className="font-display text-[32px] font-[500] leading-[1.05] tracking-[-0.01em] text-[#1A1512]">
        Cut a new one.
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[#5C554E]">
        Pick something you haven&apos;t used before.
      </p>

      <form onSubmit={handleSubmit} className="mt-7 space-y-5" noValidate>
        <div>
          <label htmlFor="password" className={labelClass}>New password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            autoFocus
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="confirm" className={labelClass}>Confirm</label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Retype it"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputClass}
          />
        </div>

        {error && (
          <p className="rounded-[2px] border border-[#8B2A14]/30 bg-[#FBEEE8] px-3 py-2 text-[13px] text-[#6B1F0E]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !token}
          className="w-full rounded-[2px] bg-[#1A1512] px-4 py-3.5 text-[13px] font-[500] uppercase tracking-[0.25em] text-[#F5F1EA] transition-colors hover:bg-[#D4A017] hover:text-[#1A1512] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Setting…' : 'Set password'}
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
