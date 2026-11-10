import Link from 'next/link';
import { DollarSign, TrendingUp, Clock, AlertTriangle, RefreshCw, Building2 } from 'lucide-react';
import { withPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { getQboFinancials, QBO_PERIOD_LABELS, type QboPeriod } from '@/lib/qbo';

export const metadata = { title: 'CFO Dashboard | VIBE' };

interface SearchParams {
  searchParams: Promise<{ period?: string; entityId?: string }>;
}

const PERIODS: QboPeriod[] = ['mtd', 'qtd', 'ytd', 'all'];

function parsePeriod(raw: string | undefined): QboPeriod {
  return (PERIODS as string[]).includes(raw ?? '') ? (raw as QboPeriod) : 'ytd';
}

function fmtUsd(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function fmtAgo(iso: string | null): string {
  if (!iso) return 'never';
  const delta = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(delta / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

// Freshness color for the "last sync" label: <1h emerald, <6h amber, else red.
// Module-scoped (not a render body) so the Date.now() read is allowed.
function freshnessColor(lastSyncAt: string | null): string {
  if (!lastSyncAt) return 'text-red-400';
  const age = Date.now() - new Date(lastSyncAt).getTime();
  if (age < 3_600_000) return 'text-emerald-400';
  if (age < 6 * 3_600_000) return 'text-amber-400';
  return 'text-red-400';
}

export default async function CfoDashboard({ searchParams }: SearchParams) {
  const { period: rawPeriod, entityId: rawEntityId } = await searchParams;
  const period = parsePeriod(rawPeriod);
  const selectedEntityId = rawEntityId && rawEntityId !== 'all' ? rawEntityId : null;

  const { data, entities } = await withPermission('dashboard.view', async (ctx) => {
    const [financials, entityList] = await Promise.all([
      getQboFinancials(ctx.tenantId, period, selectedEntityId),
      prisma.businessEntity.findMany({
        where: { tenantId: ctx.tenantId },
        select: { id: true, name: true, color: true },
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      }),
    ]);
    return { data: financials, entities: entityList };
  });

  if (!data.connected) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <h1 className="text-2xl font-bold text-white">CFO Dashboard</h1>
        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-10 text-center">
          <DollarSign className="mx-auto h-8 w-8 text-zinc-600" />
          <h2 className="mt-4 text-lg font-semibold text-white">QuickBooks not connected</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Connect your QuickBooks Online account to see revenue, AR, and payment data here.
          </p>
          <Link
            href="/settings/quickbooks"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-[#D4A017] px-4 py-2 text-sm font-semibold text-[#0A0A0F] hover:bg-[#D4A017]/90"
          >
            Connect QuickBooks
          </Link>
        </div>
      </div>
    );
  }

  const freshnessClass = freshnessColor(data.lastSyncAt);

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">CFO Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-400">Financial snapshot from QuickBooks Online</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <RefreshCw className={['h-3.5 w-3.5', freshnessClass].join(' ')} />
          <span className={freshnessClass}>Last sync {fmtAgo(data.lastSyncAt)}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Period selector */}
        <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900/40 p-1 text-xs">
          {PERIODS.map((p) => {
            const active = p === data.period;
            const qs = new URLSearchParams({ period: p });
            if (selectedEntityId) qs.set('entityId', selectedEntityId);
            return (
              <Link
                key={p}
                href={`/cfo?${qs.toString()}`}
                className={[
                  'rounded-md px-3 py-1.5 font-medium transition-colors',
                  active
                    ? 'bg-[#D4A017] text-[#0A0A0F]'
                    : 'text-zinc-400 hover:text-white',
                ].join(' ')}
                prefetch
              >
                {QBO_PERIOD_LABELS[p]}
              </Link>
            );
          })}
        </div>

        {entities.length > 0 ? (
          <div className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-1.5 text-xs">
            <Building2 className="h-3.5 w-3.5 text-zinc-500" />
            <EntityPicker
              entities={entities}
              selectedEntityId={selectedEntityId}
              period={period}
            />
          </div>
        ) : null}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={<DollarSign className="h-5 w-5" />}
          label={`Revenue (paid) · ${data.periodLabel}`}
          value={fmtUsd(data.totalQboRevenue)}
          tone="gold"
        />
        <Kpi
          icon={<TrendingUp className="h-5 w-5" />}
          label="Outstanding AR (current)"
          value={fmtUsd(data.outstandingAR)}
          tone="emerald"
        />
        <Kpi
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Overdue invoices (current)"
          value={String(data.overdueInvoices)}
          tone={data.overdueInvoices > 0 ? 'red' : 'neutral'}
        />
        <Kpi
          icon={<Clock className="h-5 w-5" />}
          label="Sync status"
          value={data.syncStatus}
          tone={data.syncStatus === 'idle' ? 'emerald' : data.syncStatus === 'error' ? 'red' : 'amber'}
        />
      </div>

      {/* Recent payments */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">
            Recent payments · {data.periodLabel}
          </h2>
          {data.periodStart ? (
            <span className="text-xs text-zinc-500">
              Since {new Date(data.periodStart).toLocaleDateString()}
            </span>
          ) : null}
        </div>
        {data.recentPayments.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            No payments in this period. First sync runs within the hour.
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-md border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/60 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-2 text-left">Customer</th>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.recentPayments.map((p) => (
                  <tr key={p.id} className="border-t border-zinc-800/60">
                    <td className="px-4 py-2.5 text-zinc-200">{p.customerName}</td>
                    <td className="px-4 py-2.5 text-zinc-500">{new Date(p.txnDate).toLocaleDateString()}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-emerald-400">{fmtUsd(p.totalAmt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div>
          <p className="text-sm font-medium text-white">Financial alerts</p>
          <p className="mt-1 text-xs text-zinc-500">
            Get notified when revenue drops, AR ages, invoices go overdue, or a big payment lands.
          </p>
        </div>
        <Link
          href="/settings/alerts"
          className="rounded-md border border-zinc-800 px-3 py-2 text-xs text-zinc-200 hover:border-zinc-700"
        >
          Configure
        </Link>
      </div>

      <p className="text-xs text-zinc-500">
        Select an entity above to scope revenue, AR, and overdue counts to that line of business.
        QBO invoices and payments need their <code>entityId</code> populated (manually or via an
        import mapping) to appear in a filtered view.
      </p>
    </div>
  );
}

function EntityPicker({
  entities,
  selectedEntityId,
  period,
}: {
  entities: { id: string; name: string; color: string }[];
  selectedEntityId: string | null;
  period: QboPeriod;
}) {
  const items = [{ id: 'all', name: 'All entities', color: '#71717a' }, ...entities];
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((e) => {
        const isAll = e.id === 'all';
        const active = isAll ? !selectedEntityId : selectedEntityId === e.id;
        const qs = new URLSearchParams({ period });
        if (!isAll) qs.set('entityId', e.id);
        return (
          <Link
            key={e.id}
            href={`/cfo?${qs.toString()}`}
            className={[
              'rounded-md px-2 py-0.5 text-xs font-medium transition-colors',
              active
                ? 'bg-zinc-800 text-white'
                : 'text-zinc-500 hover:text-zinc-200',
            ].join(' ')}
            style={active && !isAll ? { color: e.color } : undefined}
          >
            {e.name}
          </Link>
        );
      })}
    </div>
  );
}

function Kpi(props: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: 'gold' | 'emerald' | 'red' | 'amber' | 'neutral';
}) {
  const toneMap: Record<string, string> = {
    gold: 'text-[#D4A017]',
    emerald: 'text-emerald-400',
    red: 'text-red-400',
    amber: 'text-amber-400',
    neutral: 'text-zinc-400',
  };
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500">
        <span className={toneMap[props.tone]}>{props.icon}</span>
        {props.label}
      </div>
      <div className={['mt-3 text-2xl font-bold', toneMap[props.tone]].join(' ')}>{props.value}</div>
    </div>
  );
}
