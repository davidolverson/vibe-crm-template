'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';

type Field = {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options: string | null;
};

type HostedFormClientProps = {
  formId: string;
  fields: Field[];
};

const BASE_FIELDS: Field[] = [
  { id: '__name', label: 'Name', type: 'text', required: true, options: null },
  {
    id: '__email',
    label: 'Email',
    type: 'email',
    required: true,
    options: null,
  },
  { id: '__phone', label: 'Phone', type: 'tel', required: false, options: null },
  {
    id: '__message',
    label: 'Message',
    type: 'textarea',
    required: false,
    options: null,
  },
];

function parseOptions(options: string | null): string[] {
  if (!options) return [];
  try {
    const parsed = JSON.parse(options);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return options
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
}

export function HostedFormClient({ formId, fields }: HostedFormClientProps) {
  const renderFields = fields.length > 0 ? fields : BASE_FIELDS;
  const [values, setValues] = useState<Record<string, string>>({});
  const [honeypot, setHoneypot] = useState('');
  const [pending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);

  function fieldName(f: Field): string {
    // Preserve the label as-is for custom fields (the submit endpoint accepts
    // arbitrary keys); use stable names for the baseline fields.
    if (f.id === '__name') return 'name';
    if (f.id === '__email') return 'email';
    if (f.id === '__phone') return 'phone';
    if (f.id === '__message') return 'message';
    return f.label;
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (honeypot) return; // bot tripwire

    startTransition(async () => {
      const payload: Record<string, string> = {};
      for (const f of renderFields) {
        const v = values[f.id] ?? '';
        if (v) payload[fieldName(f)] = v;
      }

      const res = await fetch(`/api/forms/${formId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };
      if (!res.ok || !data.success) {
        toast.error(data.error || 'Submission failed. Please try again.');
        return;
      }
      setSubmitted(true);
      toast.success("You're in. We'll be in touch.");
    });
  }

  if (submitted) {
    return (
      <div role="status" className="text-center py-6">
        <p className="vibe-headline text-3xl text-zinc-100 mb-3">
          <span className="vibe-gold">✦</span> Thank you.
        </p>
        <p className="text-zinc-400 leading-relaxed">
          We received your message. Someone will be in touch soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {renderFields.map((f) => {
        const selectOpts = f.type === 'select' ? parseOptions(f.options) : [];
        const name = fieldName(f);
        const id = `f-${f.id}`;
        const value = values[f.id] ?? '';
        const setVal = (v: string) =>
          setValues((prev) => ({ ...prev, [f.id]: v }));

        return (
          <div key={f.id}>
            <label
              htmlFor={id}
              className="font-mono text-[11px] tracking-wider uppercase text-zinc-500 mb-2 block"
            >
              {f.label}
              {f.required ? <span className="vibe-gold ml-1">*</span> : null}
            </label>
            {f.type === 'textarea' ? (
              <textarea
                id={id}
                name={name}
                required={f.required}
                value={value}
                onChange={(e) => setVal(e.target.value)}
                rows={5}
                className="w-full bg-[#0A0A0F] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#D4A017]/60 focus:ring-2 focus:ring-[#D4A017]/20 transition-colors resize-y"
              />
            ) : f.type === 'select' && selectOpts.length > 0 ? (
              <select
                id={id}
                name={name}
                required={f.required}
                value={value}
                onChange={(e) => setVal(e.target.value)}
                className="w-full bg-[#0A0A0F] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-[#D4A017]/60 focus:ring-2 focus:ring-[#D4A017]/20 transition-colors"
              >
                <option value="" disabled>
                  Select an option
                </option>
                {selectOpts.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={id}
                name={name}
                type={f.type || 'text'}
                required={f.required}
                value={value}
                onChange={(e) => setVal(e.target.value)}
                className="w-full bg-[#0A0A0F] border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-[#D4A017]/60 focus:ring-2 focus:ring-[#D4A017]/20 transition-colors"
              />
            )}
          </div>
        );
      })}

      {/* honeypot */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        aria-hidden="true"
        className="absolute -left-[9999px] w-0 h-0 opacity-0"
        name="website"
      />

      <button
        type="submit"
        disabled={pending}
        className="w-full vibe-gold-bg text-[#0A0A0F] font-semibold rounded-full px-6 py-4 hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition-[filter] duration-200"
      >
        {pending ? 'Sending…' : 'Send'}
      </button>
    </form>
  );
}
