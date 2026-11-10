'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Confetti } from './confetti';
import { ShareRail } from './share-rail';

type WaitlistFormProps = {
  context: 'hero' | 'founding' | 'final';
  primaryLabel: string;
  placeholder?: string;
  note?: string;
};

export function WaitlistForm({
  context,
  primaryLabel,
  placeholder = 'you@example.com',
  note,
}: WaitlistFormProps) {
  const [email, setEmail] = useState('');
  const [pending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, context }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        toast.error(data.error || 'Something went wrong -- try again.');
        return;
      }
      setSubmitted(true);
      setEmail('');
      toast.success(
        context === 'founding'
          ? 'Founding spot reserved. Watch your inbox.'
          : "You're on the list.",
      );
    });
  }

  if (submitted) {
    const isFounding = context === 'founding';
    const refTag = isFounding ? 'founding' : context === 'hero' ? 'hero' : 'final';
    return (
      <div
        role="status"
        className="relative rounded-2xl border border-[#D4A017]/40 overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, rgba(212,160,23,0.12) 0%, rgba(10,10,15,1) 55%, rgba(26,26,46,1) 100%)',
        }}
      >
        <Confetti />
        <div className="relative p-8 text-center">
          <p className="vibe-headline text-3xl text-zinc-100 mb-2">
            <span className="vibe-gold">✦</span>{' '}
            {isFounding ? 'Founding seat reserved.' : "You're on the list."}
          </p>
          <p className="text-zinc-400 mb-6 leading-relaxed">
            {isFounding
              ? 'We locked in founder pricing forever. Confirmation email is on the way.'
              : "We'll send launch updates and founding-member access only."}
          </p>

          <div className="rounded-xl border border-zinc-800 bg-[#0A0A0F]/60 p-5 mb-5">
            <p className="vibe-eyebrow mb-3">Jump the line</p>
            <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
              Share VIBE with three operators. We move you forward in the
              queue and comp your first billed month when any of them
              convert.
            </p>
            <ShareRail refTag={refTag} />
          </div>

          <p className="font-mono text-[11px] tracking-wider uppercase text-zinc-500">
            Reply to the confirmation email any time -- a real person reads every one.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-0 sm:rounded-full sm:border sm:border-zinc-700 sm:bg-[#14141D] sm:p-1.5 sm:pl-6 focus-within:sm:border-[#D4A017]/60 transition-colors">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={placeholder}
          aria-label="Email address"
          className="flex-1 bg-[#14141D] text-zinc-100 placeholder:text-zinc-500 px-6 py-4 sm:bg-transparent sm:px-0 sm:py-2 rounded-full border border-zinc-700 sm:border-0 focus:outline-none focus:ring-2 focus:ring-[#D4A017]/40 sm:focus:ring-0"
        />
        <button
          type="submit"
          disabled={pending}
          className="vibe-gold-bg text-[#0A0A0F] font-semibold rounded-full px-6 py-3.5 hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition-[filter] duration-200"
        >
          {pending ? 'Submitting…' : primaryLabel}
        </button>
      </div>
      {note ? <p className="mt-4 text-xs text-zinc-500">{note}</p> : null}
    </form>
  );
}
