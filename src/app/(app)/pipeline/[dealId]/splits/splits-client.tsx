'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Check, X } from 'lucide-react';
import { createSplit, updateSplit, deleteSplit } from './actions';
import {
  PAYEE_TYPE_LABELS,
  bpsToPercent,
  percentToBps,
  fmtCents,
  computeTotals,
  type SplitRow,
} from '@/lib/commission-splits-meta';

interface Props {
  deal: { id: string; name: string; value: number; contactName: string; pipelineName: string };
  splits: SplitRow[];
  users: Array<{ id: string; label: string }>;
  contacts: Array<{ id: string; label: string }>;
  entities: Array<{ id: string; label: string }>;
  canEdit: boolean;
}

export function SplitsClient({ deal, splits, users, contacts, entities, canEdit }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const totals = computeTotals(splits);

  function onCreate(formData: FormData) {
    setFormError(null);
    const payeeType = String(formData.get('payeeType') ?? '') as 'user' | 'contact' | 'entity';
    const payeeId = String(formData.get('payeeId') ?? '');
    const percent = String(formData.get('percent') ?? '0');
    const amount = String(formData.get('amount') ?? '0');
    const note = String(formData.get('note') ?? '');

    if (!payeeId) {
      setFormError('Pick a payee.');
      return;
    }

    startTransition(async () => {
      const res = await createSplit({
        dealId: deal.id,
        payeeType,
        payeeId,
        percentBps: percentToBps(percent),
        amountCents: Math.round(Number(amount) * 100),
        note: note || undefined,
      });
      if (!res.success) {
        setFormError(res.error);
        return;
      }
      setShowForm(false);
      router.refresh();
    });
  }

  function onTogglePaid(split: SplitRow) {
    startTransition(async () => {
      const res = await updateSplit({
        id: split.id,
        dealId: deal.id,
        paid: !split.paidAt,
      });
      if (!res.success) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  }

  function onDelete(split: SplitRow) {
    if (!confirm('Delete this commission split?')) return;
    startTransition(async () => {
      const res = await deleteSplit(split.id, deal.id);
      if (!res.success) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  }

  function payeeOptionsFor(payeeType: 'user' | 'contact' | 'entity') {
    if (payeeType === 'user') return users;
    if (payeeType === 'contact') return contacts;
    return entities;
  }

  const [currentPayeeType, setCurrentPayeeType] =
    useState<'user' | 'contact' | 'entity'>('user');

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/pipeline/${deal.id}`}
          className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to deal
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Commission splits</h1>
          <p className="mt-1 text-sm text-zinc-400">
            <span className="text-zinc-200">{deal.name}</span>
            <span className="mx-2">·</span>
            {deal.contactName}
            <span className="mx-2">·</span>
            {deal.pipelineName}
            {deal.value ? (
              <>
                <span className="mx-2">·</span>
                Deal value: <span className="text-zinc-200">{fmtCents(Math.round(deal.value * 100))}</span>
              </>
            ) : null}
          </p>
        </div>
        {canEdit ? (
          <button
            type="button"
            onClick={() => {
              setShowForm(true);
              setFormError(null);
            }}
            className="inline-flex items-center gap-2 rounded-md bg-[#D4A017] px-3 py-2 text-sm font-semibold text-[#0A0A0F] hover:bg-[#D4A017]/90"
          >
            <Plus className="h-4 w-4" />
            New split
          </button>
        ) : null}
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Kpi label="Allocated" value={`${bpsToPercent(totals.allocatedBps)}%`} tone={totals.allocatedBps > 10000 ? 'red' : 'zinc'} />
        <Kpi label="Remaining" value={`${bpsToPercent(totals.remainingBps)}%`} tone={totals.remainingBps === 0 ? 'emerald' : 'amber'} />
        <Kpi label="Paid out" value={fmtCents(totals.paidCents)} tone="emerald" />
        <Kpi label="Unpaid" value={fmtCents(totals.unpaidCents)} tone={totals.unpaidCents > 0 ? 'amber' : 'zinc'} />
      </div>

      {totals.allocatedBps > 10000 ? (
        <div className="rounded-md border border-red-900/60 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          Warning: splits total more than 100% ({bpsToPercent(totals.allocatedBps)}%). Adjust percentages before
          marking any paid.
        </div>
      ) : null}

      {/* Splits list */}
      {splits.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-10 text-center">
          <p className="text-sm text-zinc-400">
            No splits on this deal yet. Add one to track who gets paid.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/60 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 text-left">Payee</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-right">Percent</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {splits.map((s) => (
                <tr key={s.id} className="border-t border-zinc-800/60">
                  <td className="px-4 py-3 text-zinc-200">{s.payeeLabel}</td>
                  <td className="px-4 py-3 text-xs text-zinc-400">{PAYEE_TYPE_LABELS[s.payeeType].split(' ')[0]}</td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-200">{bpsToPercent(s.percentBps)}%</td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-200">{fmtCents(s.amountCents)}</td>
                  <td className="px-4 py-3">
                    {s.paidAt ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-900/60 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                        <Check className="h-3 w-3" />
                        Paid {new Date(s.paidAt).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full border border-amber-900/60 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">
                        Unpaid
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canEdit ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onTogglePaid(s)}
                            disabled={isPending}
                            className="rounded-md border border-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:border-zinc-700 disabled:opacity-50"
                          >
                            {s.paidAt ? 'Mark unpaid' : 'Mark paid'}
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(s)}
                            disabled={isPending}
                            aria-label="Delete split"
                            className="rounded-md border border-zinc-800 p-1.5 text-red-400 hover:border-red-900 disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New-split dialog */}
      {showForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form
            action={onCreate}
            className="w-full max-w-md space-y-4 rounded-xl border border-zinc-800 bg-zinc-950 p-6"
          >
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold text-white">New commission split</h2>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormError(null);
                }}
                className="rounded-md p-1 text-zinc-400 hover:bg-zinc-900 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300">Payee type</label>
              <select
                name="payeeType"
                value={currentPayeeType}
                onChange={(e) => setCurrentPayeeType(e.target.value as 'user' | 'contact' | 'entity')}
                className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-[#D4A017] focus:outline-none"
              >
                <option value="user">{PAYEE_TYPE_LABELS.user}</option>
                <option value="contact">{PAYEE_TYPE_LABELS.contact}</option>
                <option value="entity">{PAYEE_TYPE_LABELS.entity}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300">Payee</label>
              <select
                name="payeeId"
                required
                className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-[#D4A017] focus:outline-none"
              >
                <option value="">Select…</option>
                {payeeOptionsFor(currentPayeeType).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-zinc-300">Percent (%)</label>
                <input
                  name="percent"
                  type="number"
                  step="0.01"
                  min={0}
                  max={100}
                  defaultValue="50"
                  className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-sm text-white focus:border-[#D4A017] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300">Amount ($)</label>
                <input
                  name="amount"
                  type="number"
                  step="0.01"
                  min={0}
                  defaultValue={deal.value ? String(Math.round(deal.value * 0.5 * 100) / 100) : '0'}
                  className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-sm text-white focus:border-[#D4A017] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300">Note (optional)</label>
              <input
                name="note"
                maxLength={500}
                className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-[#D4A017] focus:outline-none"
              />
            </div>

            {formError ? <p className="text-sm text-red-400">{formError}</p> : null}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormError(null);
                }}
                className="rounded-md border border-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-md bg-[#D4A017] px-4 py-2 text-sm font-semibold text-[#0A0A0F] hover:bg-[#D4A017]/90 disabled:opacity-50"
              >
                {isPending ? 'Saving…' : 'Save split'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: 'zinc' | 'emerald' | 'amber' | 'red' }) {
  const toneMap: Record<string, string> = {
    zinc: 'text-zinc-200',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
  };
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={`mt-2 text-xl font-bold ${toneMap[tone]}`}>{value}</div>
    </div>
  );
}
