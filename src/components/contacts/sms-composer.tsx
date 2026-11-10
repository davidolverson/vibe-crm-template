'use client';

import { useState, useTransition } from 'react';
import { MessageSquare, Send, X, Sparkles, Wand2 } from 'lucide-react';
import { sendSmsToContact } from '@/app/(app)/contacts/[contactId]/sms-actions';

const MAX_LEN = 1600;

export function SmsComposer(props: {
  contactId: string;
  contactName?: string;
  phone: string | null;
  optedOut: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [pending, startTransition] = useTransition();
  const [aiPending, setAiPending] = useState(false);
  const [aiHint, setAiHint] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  if (!props.phone) return null;

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function send() {
    if (!body.trim()) return;
    startTransition(async () => {
      const r = await sendSmsToContact(props.contactId, body);
      if (!r.success) return flash(r.error);
      setBody('');
      setOpen(false);
      flash('SMS queued');
    });
  }

  async function aiDraft() {
    setAiPending(true);
    try {
      const res = await fetch('/api/ai/draft-sms', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contactName: props.contactName,
          instruction: aiHint || 'Write a friendly follow-up to stay top of mind.',
        }),
      });
      const data = await res.json();
      if (!data.success) return flash(data.error ?? 'AI draft failed');
      setBody(data.data.text.slice(0, MAX_LEN));
      flash(`Drafted (${data.remaining} left this month)`);
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Network error');
    } finally {
      setAiPending(false);
    }
  }

  async function aiRewrite(tone: 'friendlier' | 'shorter' | 'more_professional' | 'fix_grammar') {
    if (!body.trim()) return flash('Type something first.');
    setAiPending(true);
    try {
      const res = await fetch('/api/ai/rewrite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ draft: body, mode: 'sms', tone }),
      });
      const data = await res.json();
      if (!data.success) return flash(data.error ?? 'Rewrite failed');
      setBody(data.data.text.slice(0, MAX_LEN));
      flash(`Rewritten (${data.remaining} left)`);
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Network error');
    } finally {
      setAiPending(false);
    }
  }

  if (props.optedOut) {
    return (
      <button
        disabled
        className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-600"
        title="Contact opted out of SMS"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        Opted out
      </button>
    );
  }

  return (
    <>
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 rounded-md border border-[#D4A017]/40 bg-[#0A0A0F]/95 px-4 py-2 text-sm text-[#D4A017] shadow-lg">
          {toast}
        </div>
      )}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-200 hover:border-[#D4A017] hover:text-[#D4A017]"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        Send SMS
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Send SMS</h3>
                <p className="text-xs text-zinc-500">To: {props.phone}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-zinc-600 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <textarea
              autoFocus
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, MAX_LEN))}
              rows={5}
              placeholder="Type your message or click Draft with AI..."
              className="w-full resize-none rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#D4A017]"
              disabled={pending || aiPending}
            />

            <div className="mt-2 rounded-md border border-zinc-800/80 bg-zinc-900/40 p-2">
              <div className="flex items-center gap-2">
                <input
                  value={aiHint}
                  onChange={(e) => setAiHint(e.target.value)}
                  placeholder="What do you want to say? (optional)"
                  disabled={aiPending || pending}
                  className="flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-xs text-white outline-none focus:border-[#D4A017]"
                />
                <button
                  type="button"
                  onClick={aiDraft}
                  disabled={aiPending || pending}
                  className="inline-flex items-center gap-1 rounded-md border border-[#D4A017]/40 bg-[#D4A017]/10 px-2 py-1 text-xs text-[#D4A017] hover:bg-[#D4A017]/20 disabled:opacity-50"
                >
                  <Sparkles className="h-3 w-3" />
                  {aiPending ? 'Thinking...' : 'Draft with AI'}
                </button>
              </div>
              {body.trim() ? (
                <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px]">
                  <span className="text-zinc-500">Rewrite:</span>
                  <button
                    type="button"
                    onClick={() => aiRewrite('friendlier')}
                    disabled={aiPending || pending}
                    className="inline-flex items-center gap-1 rounded border border-zinc-800 px-1.5 py-0.5 text-zinc-300 hover:border-zinc-700 disabled:opacity-50"
                  >
                    <Wand2 className="h-2.5 w-2.5" />
                    Friendlier
                  </button>
                  <button
                    type="button"
                    onClick={() => aiRewrite('shorter')}
                    disabled={aiPending || pending}
                    className="rounded border border-zinc-800 px-1.5 py-0.5 text-zinc-300 hover:border-zinc-700 disabled:opacity-50"
                  >
                    Shorter
                  </button>
                  <button
                    type="button"
                    onClick={() => aiRewrite('more_professional')}
                    disabled={aiPending || pending}
                    className="rounded border border-zinc-800 px-1.5 py-0.5 text-zinc-300 hover:border-zinc-700 disabled:opacity-50"
                  >
                    More pro
                  </button>
                  <button
                    type="button"
                    onClick={() => aiRewrite('fix_grammar')}
                    disabled={aiPending || pending}
                    className="rounded border border-zinc-800 px-1.5 py-0.5 text-zinc-300 hover:border-zinc-700 disabled:opacity-50"
                  >
                    Fix grammar
                  </button>
                </div>
              ) : null}
            </div>

            <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
              <span>{body.length} / {MAX_LEN}</span>
              <button
                onClick={send}
                disabled={pending || aiPending || !body.trim()}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#D4A017] px-4 py-1.5 text-xs font-semibold text-[#0A0A0F] hover:bg-[#D4A017]/90 disabled:opacity-40"
              >
                <Send className="h-3.5 w-3.5" />
                {pending ? 'Sending...' : 'Send'}
              </button>
            </div>
            <p className="mt-3 text-[11px] text-zinc-600">
              Inbound replies thread on this contact&apos;s timeline automatically. Texting STOP opts the contact out.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
