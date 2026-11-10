'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Power } from 'lucide-react';
import { toggleAiKillSwitch } from './actions';

// `killOn` -- true when the kill switch is active, meaning AI features are
// DISABLED for all tenants. When killOn is true we show RED to signal the
// non-healthy state; when false we show GREEN (operational). Previous version
// had the color semantics inverted.
export function KillSwitchToggle({ killOn }: { killOn: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function flip() {
    setError(null);
    const note =
      prompt(killOn ? 'Re-enable AI features. Optional note:' : 'Disable AI features. Reason?', '') ??
      '';
    if (!killOn && !note.trim()) {
      setError('A reason is required when disabling AI.');
      return;
    }
    startTransition(async () => {
      try {
        await toggleAiKillSwitch(!killOn, note);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed');
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={flip}
        disabled={isPending}
        className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold disabled:opacity-50 ${
          killOn
            ? 'border-red-900/60 bg-red-500/10 text-red-400 hover:border-red-800'
            : 'border-emerald-900/60 bg-emerald-500/10 text-emerald-400 hover:border-emerald-800'
        }`}
      >
        <Power className="h-4 w-4" />
        {killOn ? 'AI DISABLED -- click to re-enable' : 'AI enabled -- click to disable'}
      </button>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
