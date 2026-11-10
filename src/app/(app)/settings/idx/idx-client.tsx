'use client';

import { useState, useTransition } from 'react';
import { saveIdxConfig, type IdxConfig } from './actions';

const VENDOR_LABELS: Record<string, string> = {
  ihomefinder: 'iHomeFinder',
  showcase_idx: 'Showcase IDX',
  realtyna: 'Realtyna',
  custom: 'Custom (paste raw embed)',
  '': 'Not configured',
};

export function IdxSettingsClient(props: { initial: IdxConfig; canEdit: boolean }) {
  const [vendor, setVendor] = useState<IdxConfig['vendor']>(props.initial.vendor);
  const [widgetCode, setWidgetCode] = useState(props.initial.widgetCode);
  const [disclaimer, setDisclaimer] = useState(props.initial.disclaimer);
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await saveIdxConfig({ vendor, widgetCode, disclaimer });
      if (!r.success) return flash(r.error);
      flash('Saved');
    });
  }

  return (
    <form onSubmit={handleSave} className="space-y-5 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      {toast && (
        <div className="rounded-md border border-[#D4A017]/40 bg-[#D4A017]/10 px-4 py-2 text-sm text-[#D4A017]">
          {toast}
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-400">IDX vendor</label>
        <select
          value={vendor}
          onChange={(e) => setVendor(e.target.value as IdxConfig['vendor'])}
          disabled={!props.canEdit || pending}
          className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-[#D4A017]"
        >
          <option value="">Select a vendor</option>
          {Object.entries(VENDOR_LABELS)
            .filter(([k]) => k !== '')
            .map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-400">Widget embed code</label>
        <p className="mb-2 text-xs text-zinc-600">
          Paste the raw HTML/JS provided by your IDX vendor. Scripts run on site pages that include an IDX block.
        </p>
        <textarea
          value={widgetCode}
          onChange={(e) => setWidgetCode(e.target.value)}
          placeholder="<script src=&quot;...&quot;></script>"
          rows={6}
          disabled={!props.canEdit || pending}
          className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-xs text-white outline-none focus:border-[#D4A017]"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-zinc-400">MLS disclaimer (optional)</label>
        <textarea
          value={disclaimer}
          onChange={(e) => setDisclaimer(e.target.value)}
          rows={3}
          disabled={!props.canEdit || pending}
          placeholder="The data relating to real estate..."
          className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 outline-none focus:border-[#D4A017]"
        />
      </div>

      <button
        type="submit"
        disabled={!props.canEdit || pending}
        className="rounded-md bg-[#D4A017] px-4 py-2 text-sm font-semibold text-[#0A0A0F] hover:bg-[#D4A017]/90 disabled:opacity-40"
      >
        Save
      </button>
    </form>
  );
}
