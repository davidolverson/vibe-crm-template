'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { signUp } from '@/lib/auth-client';

const inputClass =
  'block w-full rounded-[2px] border-0 border-b border-[#C9BFA8] bg-transparent px-0 py-2.5 text-[15px] text-[#1A1512] placeholder:text-[#A89E85] focus:border-[#D4A017] focus:outline-none focus:ring-0 transition-colors';
const labelClass =
  'mb-1.5 block font-mono text-[10px] uppercase tracking-[0.3em] text-[#5C554E]';

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signUp.email({ name, email, password });
      if (result.error) {
        const msg = result.error.message ?? "We couldn't open the account.";
        setError(msg);
        toast.error(msg);
        return;
      }
      router.push('/onboarding');
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Something went wrong on our end. Try again in a moment.';
      console.error('[sign-up]', err);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-[#8A817A]">
        New Member
      </p>
      <h1 className="font-display text-[32px] font-[500] leading-[1.05] tracking-[-0.01em] text-[#1A1512]">
        Take the keys.
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[#5C554E]">
        Set up your brokerage in a minute. No card required.
      </p>

      <form onSubmit={handleSubmit} className="mt-7 space-y-5" noValidate>
        <div>
          <label htmlFor="name" className={labelClass}>Your name</label>
          <input
            id="name"
            name="name"
            required
            autoComplete="name"
            autoFocus
            placeholder="Jane Smith"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="email" className={labelClass}>Work email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="password" className={labelClass}>Password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            aria-describedby="password-hint"
          />
          <p id="password-hint" className="mt-1 text-xs text-zinc-500">
            Minimum 8 characters. Use a mix of letters and numbers.
          </p>
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
          {loading ? 'Opening…' : 'Open account'}
        </button>

        <p className="text-[11px] leading-relaxed text-[#8A817A]">
          By continuing you agree to the{' '}
          <Link href="/terms" className="underline decoration-[#D4A017]/40 underline-offset-2 hover:text-[#8B6914]">Terms</Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline decoration-[#D4A017]/40 underline-offset-2 hover:text-[#8B6914]">Privacy</Link>.
        </p>
      </form>

      <div className="mt-7 border-t border-[#D4A017]/20 pt-5">
        <p className="text-center font-mono text-[11px] uppercase tracking-[0.2em] text-[#8A817A]">
          Already a member?{' '}
          <Link href="/sign-in" className="text-[#8B6914] hover:text-[#D4A017] transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </>
  );
}
