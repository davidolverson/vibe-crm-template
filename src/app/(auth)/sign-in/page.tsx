'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { signIn, authClient } from '@/lib/auth-client';

const inputClass =
  'block w-full rounded-[2px] border-0 border-b border-[#C9BFA8] bg-transparent px-0 py-2.5 text-[15px] text-[#1A1512] placeholder:text-[#A89E85] focus:border-[#D4A017] focus:outline-none focus:ring-0 transition-colors';
const labelClass =
  'mb-1.5 block font-mono text-[10px] uppercase tracking-[0.3em] text-[#5C554E]';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signIn.email({ email, password });
      if (result.error) {
        const msg = result.error.message ?? "Those credentials didn't match.";
        setError(msg);
        toast.error(msg);
        return;
      }
      const orgs = await authClient.organization.list();
      const list = Array.isArray(orgs.data) ? orgs.data : [];
      if (list.length > 0) {
        await authClient.organization.setActive({ organizationId: list[0].id });
        router.push('/dashboard');
      } else {
        router.push('/onboarding');
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Something went wrong on our end. Try again in a moment.';
      console.error('[sign-in]', err);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-[#8A817A]">
        Member Entry
      </p>
      <h1 className="font-display text-[32px] font-[500] leading-[1.05] tracking-[-0.01em] text-[#1A1512]">
        Back to the floor.
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[#5C554E]">
        Your pipeline, your deals, your people.
      </p>

      <form onSubmit={handleSubmit} className="mt-7 space-y-5" noValidate>
        <div>
          <label htmlFor="email" className={labelClass}>Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            autoFocus
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="password" className={labelClass}>Password</label>
            <Link
              href="/forgot-password"
              className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#8A817A] hover:text-[#8B6914] transition-colors"
            >
              Misplaced it?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          disabled={loading}
          className="w-full rounded-[2px] bg-[#1A1512] px-4 py-3.5 text-[13px] font-[500] uppercase tracking-[0.25em] text-[#F5F1EA] transition-colors hover:bg-[#D4A017] hover:text-[#1A1512] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Unlocking…' : 'Enter'}
        </button>
      </form>

      <div className="mt-7 border-t border-[#D4A017]/20 pt-5">
        <p className="text-center font-mono text-[11px] uppercase tracking-[0.2em] text-[#8A817A]">
          First time?{' '}
          <Link href="/sign-up" className="text-[#8B6914] hover:text-[#D4A017] transition-colors">
            Open an account
          </Link>
        </p>
      </div>
    </>
  );
}
