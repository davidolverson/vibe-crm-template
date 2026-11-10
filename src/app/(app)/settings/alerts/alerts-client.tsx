'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, BellOff, Save, AlertTriangle } from 'lucide-react';
import { ALERT_RULE_COPY } from '@/lib/alerts-meta';
import { updateAlertRule } from './actions';

export type AlertRuleRow = {
  id: string;
  type: 'revenue_drop' | 'ar_aging' | 'invoice_overdue' | 'payment_received';
  enabled: boolean;
  thresholdValue: number;
  thresholdUnit: 'percent' | 'days' | 'amount';
  lastTriggeredAt: string | null;
};

interface Props {
  rules: AlertRuleRow[];
  canEdit: boolean;
  qboConnected: boolean;
}

export function AlertsClient({ rules, canEdit, qboConnected }: Props) {
  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Financial alerts</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Cron checks these rules every night against your QuickBooks data and notifies workspace
          owners when a threshold is crossed.
        </p>
      </div>

      {!qboConnected ? (
        <div className="rounded-xl border border-amber-900/60 bg-amber-500/10 p-4 text-sm text-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              QuickBooks is not connected. Rules still exist but nothing will fire until you{' '}
              <Link href="/settings/quickbooks" className="underline hover:text-amber-100">
                connect QuickBooks
              </Link>
              .
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        {rules.map((rule) => (
          <AlertRuleCard key={rule.id} rule={rule} canEdit={canEdit} />
        ))}
      </div>
    </div>
  );
}

function AlertRuleCard({ rule, canEdit }: { rule: AlertRuleRow; canEdit: boolean }) {
  const router = useRouter();
  const copy = ALERT_RULE_COPY[rule.type];
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState<string>(String(rule.thresholdValue));
  const [unit, setUnit] = useState(rule.thresholdUnit);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const dirty =
    Number(value) !== rule.thresholdValue || unit !== rule.thresholdUnit;

  function onToggle() {
    setMsg(null);
    startTransition(async () => {
      const res = await updateAlertRule({ id: rule.id, enabled: !rule.enabled });
      if (!res.success) {
        setMsg({ kind: 'err', text: res.error });
        return;
      }
      router.refresh();
    });
  }

  function onSave() {
    setMsg(null);
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) {
      setMsg({ kind: 'err', text: 'Threshold must be a non-negative number.' });
      return;
    }
    startTransition(async () => {
      const res = await updateAlertRule({
        id: rule.id,
        thresholdValue: num,
        thresholdUnit: unit,
      });
      if (!res.success) {
        setMsg({ kind: 'err', text: res.error });
        return;
      }
      setMsg({ kind: 'ok', text: 'Saved.' });
      router.refresh();
    });
  }

  const unitSuffix =
    unit === 'percent' ? '%' : unit === 'days' ? 'days' : 'USD';

  return (
    <div
      className={`rounded-xl border p-5 ${
        rule.enabled
          ? 'border-zinc-800 bg-zinc-900/40'
          : 'border-zinc-900 bg-zinc-950/60 opacity-70'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white">{copy.title}</h3>
          <p className="mt-1 text-xs text-zinc-500">{copy.description}</p>
          {rule.lastTriggeredAt ? (
            <p className="mt-2 text-xs text-zinc-500">
              Last fired {new Date(rule.lastTriggeredAt).toLocaleString()}
            </p>
          ) : (
            <p className="mt-2 text-xs text-zinc-600">Never fired.</p>
          )}
        </div>
        <button
          type="button"
          onClick={onToggle}
          disabled={!canEdit || isPending}
          aria-label={rule.enabled ? 'Disable rule' : 'Enable rule'}
          className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs ${
            rule.enabled
              ? 'border-emerald-900/60 bg-emerald-500/10 text-emerald-400 hover:border-emerald-800'
              : 'border-zinc-800 text-zinc-400 hover:border-zinc-700'
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {rule.enabled ? (
            <>
              <Bell className="h-3.5 w-3.5" />
              Enabled
            </>
          ) : (
            <>
              <BellOff className="h-3.5 w-3.5" />
              Disabled
            </>
          )}
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-zinc-400">
            {copy.thresholdLabel}
          </label>
          <input
            type="number"
            min={0}
            step="any"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={!canEdit || isPending}
            className="mt-1 w-40 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-sm text-white focus:border-[#D4A017] focus:outline-none disabled:opacity-50"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-400">Unit</label>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as typeof unit)}
            disabled={!canEdit || isPending || copy.unitOptions.length <= 1}
            className="mt-1 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-[#D4A017] focus:outline-none disabled:opacity-50"
          >
            {copy.unitOptions.map((u) => (
              <option key={u} value={u}>
                {u === 'percent' ? 'Percent (%)' : u === 'days' ? 'Days' : 'Amount (USD)'}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 text-xs text-zinc-500">
          Current threshold: <span className="font-mono text-zinc-300">{value} {unitSuffix}</span>
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={!canEdit || isPending || !dirty}
          className="inline-flex items-center gap-2 rounded-md bg-[#D4A017] px-4 py-2 text-sm font-semibold text-[#0A0A0F] hover:bg-[#D4A017]/90 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {isPending ? 'Saving...' : 'Save'}
        </button>
      </div>

      {msg ? (
        <p className={`mt-3 text-xs ${msg.kind === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>
          {msg.text}
        </p>
      ) : null}
    </div>
  );
}
