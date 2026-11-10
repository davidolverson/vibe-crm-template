import Link from 'next/link';
import { Users, TrendingUp } from 'lucide-react';
import { getHouseholdSummaryForContact, type HouseholdLineOfBusiness } from '@/lib/households';

const SOURCE_LABELS: Record<HouseholdLineOfBusiness['source'], string> = {
  real_estate: 'Real Estate',
  mortgage: 'Mortgage',
  insurance: 'Insurance',
  investment: 'Investment',
  other: 'Other',
};

const SOURCE_ACCENT: Record<HouseholdLineOfBusiness['source'], string> = {
  real_estate: 'text-[#D4A017]',
  mortgage: 'text-sky-400',
  insurance: 'text-emerald-400',
  investment: 'text-fuchsia-400',
  other: 'text-zinc-400',
};

function fmtUsd(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export async function HouseholdPanel({ tenantId, contactId }: { tenantId: string; contactId: string }) {
  const summary = await getHouseholdSummaryForContact(tenantId, contactId);

  const hasHousehold = !!summary.householdId;
  const hasLines = summary.lines.length > 0;

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Users className="h-4 w-4 text-[#D4A017]" />
            Household rollup
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            {hasHousehold
              ? `${summary.householdName} · ${summary.members.length} member${summary.members.length === 1 ? '' : 's'}`
              : 'This contact is not part of a household yet. Rollup below reflects this contact only.'}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Total LTV</div>
          <div className="mt-1 flex items-center gap-1 text-lg font-bold text-[#D4A017]">
            <TrendingUp className="h-4 w-4" />
            {fmtUsd(summary.totalLtvCents)}
          </div>
        </div>
      </header>

      {hasHousehold ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {summary.members.map((m) => {
            const isSelf = m.contactId === contactId;
            return (
              <Link
                key={m.contactId}
                href={`/contacts/${m.contactId}`}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs ${
                  isSelf
                    ? 'border-[#D4A017]/40 bg-[#D4A017]/10 text-[#D4A017]'
                    : 'border-zinc-800 text-zinc-300 hover:border-zinc-700'
                }`}
              >
                {m.name}
                <span className="text-[10px] uppercase tracking-wide text-zinc-500">{m.role}</span>
              </Link>
            );
          })}
        </div>
      ) : null}

      {!hasLines ? (
        <p className="mt-5 text-sm text-zinc-500">
          No deals or commission splits recorded for this {hasHousehold ? 'household' : 'contact'} yet.
        </p>
      ) : (
        <div className="mt-5 overflow-hidden rounded-md border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/60 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-3 py-2 text-left">Line of business</th>
                <th className="px-3 py-2 text-right">Deals</th>
                <th className="px-3 py-2 text-right">Open pipeline</th>
                <th className="px-3 py-2 text-right">Won value</th>
                <th className="px-3 py-2 text-right">Commission</th>
              </tr>
            </thead>
            <tbody>
              {summary.lines.map((l) => (
                <tr key={l.source} className="border-t border-zinc-800/60">
                  <td className={`px-3 py-2 font-medium ${SOURCE_ACCENT[l.source]}`}>
                    {SOURCE_LABELS[l.source]}
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-200">{l.dealCount}</td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-400">
                    {fmtUsd(l.openValueCents)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-emerald-400">
                    {fmtUsd(l.wonValueCents)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[#D4A017]">
                    {fmtUsd(l.commissionCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
