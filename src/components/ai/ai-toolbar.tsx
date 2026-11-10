'use client';

/**
 * Reusable AI draft + rewrite toolbar for any text surface.
 *
 * Used in:
 *  - Contact SMS composer (mode=sms)
 *  - Email template editor (mode=email, exposes subject+body setters)
 *
 * Handles network, loading state, error display, remaining-quota toast.
 */

import { useState } from 'react';
import { Sparkles, Wand2, Loader2 } from 'lucide-react';

export type RewriteTone = 'friendlier' | 'shorter' | 'more_professional' | 'more_urgent' | 'fix_grammar';

export interface AiToolbarProps {
  mode: 'sms' | 'email';
  /** Current value. For email, formatted as "Subject: ...\n\nBody..." for rewrite. */
  getBody: () => string;
  /** For sms: setter receives the new body. */
  onSetBody?: (next: string) => void;
  /** For email: setters for subject + body. */
  onSetEmail?: (next: { subject: string; body: string }) => void;
  /** Optional recipient name to improve the draft prompt. */
  contactName?: string;
  /** Optional thread subject/incoming message for replies. */
  incomingText?: string;
  /** Hidden behind an advanced switch by default; free-text intent hint. */
  defaultHint?: string;
  disabled?: boolean;
}

export function AiToolbar(props: AiToolbarProps) {
  const [pending, setPending] = useState(false);
  const [hint, setHint] = useState(props.defaultHint ?? '');
  const [status, setStatus] = useState<{ kind: 'ok' | 'err' | 'info'; text: string } | null>(null);

  async function draft() {
    setPending(true);
    setStatus(null);
    try {
      const endpoint = props.mode === 'sms' ? '/api/ai/draft-sms' : '/api/ai/draft-email';
      const payload: Record<string, unknown> = {
        contactName: props.contactName,
        instruction: hint || (props.mode === 'sms' ? 'Write a friendly follow-up.' : 'Write a professional follow-up email.'),
      };
      if (props.incomingText) {
        payload[props.mode === 'sms' ? 'incomingMessage' : 'incomingEmail'] = props.incomingText;
      }
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) {
        setStatus({ kind: 'err', text: data.error ?? 'Draft failed' });
        return;
      }
      if (props.mode === 'sms' && props.onSetBody) {
        props.onSetBody(data.data.text);
      } else if (props.mode === 'email' && props.onSetEmail) {
        props.onSetEmail({ subject: data.data.subject, body: data.data.body });
      }
      setStatus({ kind: 'ok', text: `Draft ready · ${data.remaining ?? 0} left this month` });
    } catch (err) {
      setStatus({ kind: 'err', text: err instanceof Error ? err.message : 'Network error' });
    } finally {
      setPending(false);
    }
  }

  async function rewrite(tone: RewriteTone) {
    const current = props.getBody();
    if (!current.trim()) {
      setStatus({ kind: 'err', text: 'Nothing to rewrite yet.' });
      return;
    }
    setPending(true);
    setStatus(null);
    try {
      const res = await fetch('/api/ai/rewrite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ draft: current, mode: props.mode, tone }),
      });
      const data = await res.json();
      if (!data.success) {
        setStatus({ kind: 'err', text: data.error ?? 'Rewrite failed' });
        return;
      }
      if (props.mode === 'sms' && props.onSetBody) {
        props.onSetBody(data.data.text);
      } else if (props.mode === 'email' && props.onSetEmail) {
        // For email rewrite, try to parse a "Subject: ..." preamble; if absent, body only.
        const raw = data.data.text;
        const match = raw.match(/^\s*Subject:\s*(.+?)\n\s*\n([\s\S]+)$/i);
        if (match) {
          props.onSetEmail({ subject: match[1].trim(), body: match[2].trim() });
        } else {
          // Leave subject alone, rewrite body only. Caller reads prev subject.
          props.onSetEmail({ subject: '__keep__', body: raw });
        }
      }
      setStatus({ kind: 'ok', text: `Rewritten · ${data.remaining ?? 0} left this month` });
    } catch (err) {
      setStatus({ kind: 'err', text: err instanceof Error ? err.message : 'Network error' });
    } finally {
      setPending(false);
    }
  }

  const busy = pending || props.disabled;
  const hasBody = props.getBody().trim().length > 0;

  return (
    <div className="rounded-md border border-zinc-800/80 bg-zinc-900/40 p-2.5 space-y-2">
      <div className="flex items-center gap-2">
        <input
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder={props.mode === 'sms' ? 'What do you want to say? (optional)' : 'Intent for this email (optional)'}
          disabled={busy}
          className="flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-white outline-none focus:border-[#D4A017]"
        />
        <button
          type="button"
          onClick={draft}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-md border border-[#D4A017]/40 bg-[#D4A017]/10 px-2 py-1 text-xs text-[#D4A017] hover:bg-[#D4A017]/20 disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          Draft with AI
        </button>
      </div>

      {hasBody ? (
        <div className="flex flex-wrap items-center gap-1 text-[11px]">
          <span className="text-zinc-500">Rewrite:</span>
          {(
            [
              ['friendlier', 'Friendlier'],
              ['shorter', 'Shorter'],
              ['more_professional', 'More pro'],
              ['more_urgent', 'More urgent'],
              ['fix_grammar', 'Fix grammar'],
            ] as [RewriteTone, string][]
          ).map(([tone, label]) => (
            <button
              key={tone}
              type="button"
              onClick={() => rewrite(tone)}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded border border-zinc-800 px-1.5 py-0.5 text-zinc-300 hover:border-zinc-700 disabled:opacity-50"
            >
              {tone === 'friendlier' ? <Wand2 className="h-2.5 w-2.5" /> : null}
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {status ? (
        <p
          className={`text-[11px] ${
            status.kind === 'ok' ? 'text-emerald-400' : status.kind === 'err' ? 'text-red-400' : 'text-zinc-400'
          }`}
        >
          {status.text}
        </p>
      ) : null}
    </div>
  );
}
