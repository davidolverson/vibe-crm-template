'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { REASON_LABELS, type ContactReason } from '@/lib/contact';

export function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState<ContactReason>('founding');
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name || undefined, email, reason, message }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        toast.error(data.error || 'Something went wrong -- try again.');
        return;
      }
      toast.success('Message sent. We\'ll reply within one business day.');
      setSubmitted(true);
      setName('');
      setEmail('');
      setMessage('');
    });
  }

  if (submitted) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-[#D4A017]/40 bg-[#D4A017]/10 text-zinc-100 p-8"
      >
        <p className="vibe-headline text-2xl text-zinc-100 mb-2">
          <span className="vibe-gold">✦</span> Message received.
        </p>
        <p className="text-zinc-400 leading-relaxed">
          Thanks -- a human on the VIBE team will reply within one business day.
          You should see a confirmation in your inbox now.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="font-mono text-[11px] tracking-wider uppercase text-zinc-500 mb-2 block">
            Name <span className="text-zinc-700 normal-case">(optional)</span>
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Agent"
            className="w-full bg-[#14141D] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#D4A017]/60 focus:ring-2 focus:ring-[#D4A017]/20 transition-colors"
          />
        </label>
        <label className="block">
          <span className="font-mono text-[11px] tracking-wider uppercase text-zinc-500 mb-2 block">
            Email
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full bg-[#14141D] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#D4A017]/60 focus:ring-2 focus:ring-[#D4A017]/20 transition-colors"
          />
        </label>
      </div>

      <label className="block">
        <span className="font-mono text-[11px] tracking-wider uppercase text-zinc-500 mb-2 block">
          Reason
        </span>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(REASON_LABELS) as ContactReason[]).map((r) => (
            <button
              type="button"
              key={r}
              onClick={() => setReason(r)}
              className={`rounded-full px-4 py-2 text-sm border transition-colors ${
                reason === r
                  ? 'vibe-gold-bg text-[#0A0A0F] border-[#D4A017]'
                  : 'bg-[#14141D] text-zinc-300 border-zinc-700 hover:border-zinc-500'
              }`}
              aria-pressed={reason === r}
            >
              {REASON_LABELS[r]}
            </button>
          ))}
        </div>
      </label>

      <label className="block">
        <span className="font-mono text-[11px] tracking-wider uppercase text-zinc-500 mb-2 block">
          Message
        </span>
        <textarea
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          placeholder="Tell us what you&rsquo;re building, what you run today, and what you&rsquo;d want from VIBE."
          className="w-full bg-[#14141D] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#D4A017]/60 focus:ring-2 focus:ring-[#D4A017]/20 transition-colors resize-y"
        />
      </label>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-xs text-zinc-500">
          We&rsquo;ll reply within one business day. Founding-50 inquiries get
          priority.
        </p>
        <button
          type="submit"
          disabled={pending}
          className="vibe-gold-bg text-[#0A0A0F] font-semibold rounded-full px-7 py-3.5 hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition-[filter] duration-200"
        >
          {pending ? 'Sending…' : 'Send message'}
        </button>
      </div>
    </form>
  );
}
