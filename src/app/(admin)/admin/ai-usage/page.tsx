import Link from 'next/link';
import { ArrowLeft, Zap, AlertTriangle, Shield, Activity } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { aiConfigured } from '@/lib/ai/client';
import { KillSwitchToggle } from './kill-switch-toggle';

export const metadata = { title: 'AI usage | VIBE Admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

function fmtUsd(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export default async function AiUsagePage() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [kill, totals, perTenant, recent] = await Promise.all([
    prisma.systemFlag.findUnique({ where: { key: 'AI_GLOBAL_KILL' } }),
    prisma.aiUsageEvent.aggregate({
      where: { createdAt: { gte: monthStart } },
      _sum: { costCents: true, inputTokens: true, outputTokens: true, cachedTokens: true },
      _count: true,
    }),
    prisma.aiUsageEvent.groupBy({
      by: ['tenantId'],
      where: { createdAt: { gte: monthStart } },
      _count: true,
      _sum: { costCents: true },
      orderBy: { _sum: { costCents: 'desc' } },
      take: 20,
    }),
    prisma.aiUsageEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 25,
      select: {
        id: true,
        tenantId: true,
        feature: true,
        model: true,
        inputTokens: true,
        outputTokens: true,
        cachedTokens: true,
        costCents: true,
        durationMs: true,
        success: true,
        errorMessage: true,
        createdAt: true,
      },
    }),
  ]);

  const tenantIds = perTenant.map((p) => p.tenantId);
  const tenants = tenantIds.length
    ? await prisma.tenant.findMany({
        where: { id: { in: tenantIds } },
        select: { id: true, name: true, aiMonthlyBudget: true, aiFeatureEnabled: true },
      })
    : [];
  const tenantById = new Map(tenants.map((t) => [t.id, t]));

  const killOn = !!kill?.boolValue;

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Admin home
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white">AI usage</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Per-tenant Claude consumption for the current billing month.
          {aiConfigured ? null : (
            <span className="ml-2 text-amber-400">
              <AlertTriangle className="mr-1 inline h-3 w-3" />
              ANTHROPIC_API_KEY not set. Drafts return 503.
            </span>
          )}
        </p>
      </div>

      {/* Kill-switch panel */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
              <Shield className="h-4 w-4 text-red-400" />
              Global AI kill-switch
            </h2>
            <p className="mt-1 max-w-xl text-xs text-zinc-500">
              Toggle to instantly disable all /api/ai/* routes across every tenant. Use if Anthropic
              spend spikes, a prompt-injection attack is suspected, or during a planned maintenance
              window.
            </p>
            {kill?.note ? (
              <p className="mt-2 text-xs text-zinc-400">Note: {kill.note}</p>
            ) : null}
          </div>
          <KillSwitchToggle killOn={killOn} />
        </div>
      </section>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Kpi icon={<Activity className="h-4 w-4" />} label="Calls this month" value={String(totals._count)} />
        <Kpi icon={<Zap className="h-4 w-4" />} label="Cost (MTD)" value={fmtUsd(totals._sum.costCents ?? 0)} tone="gold" />
        <Kpi
          icon={<Zap className="h-4 w-4" />}
          label="Input tokens"
          value={(totals._sum.inputTokens ?? 0).toLocaleString()}
        />
        <Kpi
          icon={<Zap className="h-4 w-4" />}
          label="Output tokens"
          value={(totals._sum.outputTokens ?? 0).toLocaleString()}
        />
      </div>

      {/* Per-tenant */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-sm font-semibold text-white">Per-tenant usage (this month)</h2>
        {perTenant.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">No AI calls yet this month.</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-md border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/60 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-3 py-2 text-left">Tenant</th>
                  <th className="px-3 py-2 text-right">Calls</th>
                  <th className="px-3 py-2 text-right">Cost</th>
                  <th className="px-3 py-2 text-right">Budget</th>
                  <th className="px-3 py-2 text-left">Flag</th>
                </tr>
              </thead>
              <tbody>
                {perTenant.map((row) => {
                  const t = tenantById.get(row.tenantId);
                  const over = t && row._count > t.aiMonthlyBudget;
                  return (
                    <tr key={row.tenantId} className="border-t border-zinc-800/60">
                      <td className="px-3 py-2 text-zinc-200">{t?.name ?? row.tenantId}</td>
                      <td className="px-3 py-2 text-right font-mono text-zinc-200">{row._count}</td>
                      <td className="px-3 py-2 text-right font-mono text-[#D4A017]">
                        {fmtUsd(row._sum.costCents ?? 0)}
                      </td>
                      <td className="px-3 py-2 text-right text-zinc-500">{t?.aiMonthlyBudget ?? '-'}</td>
                      <td className="px-3 py-2 text-xs">
                        {!t?.aiFeatureEnabled ? (
                          <span className="text-zinc-500">Disabled</span>
                        ) : over ? (
                          <span className="text-red-400">Over quota</span>
                        ) : (
                          <span className="text-emerald-400">OK</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent events */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-sm font-semibold text-white">Recent events</h2>
        {recent.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">No events yet.</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-md border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/60 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-3 py-2 text-left">Time</th>
                  <th className="px-3 py-2 text-left">Feature</th>
                  <th className="px-3 py-2 text-left">Model</th>
                  <th className="px-3 py-2 text-right">In</th>
                  <th className="px-3 py-2 text-right">Out</th>
                  <th className="px-3 py-2 text-right">Cached</th>
                  <th className="px-3 py-2 text-right">Cost</th>
                  <th className="px-3 py-2 text-right">ms</th>
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((e) => (
                  <tr key={e.id} className="border-t border-zinc-800/60">
                    <td className="px-3 py-2 text-zinc-500">
                      {new Date(e.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-zinc-300">{e.feature}</td>
                    <td className="px-3 py-2 font-mono text-xs text-zinc-400">{e.model}</td>
                    <td className="px-3 py-2 text-right font-mono text-zinc-300">{e.inputTokens}</td>
                    <td className="px-3 py-2 text-right font-mono text-zinc-300">{e.outputTokens}</td>
                    <td className="px-3 py-2 text-right font-mono text-zinc-500">{e.cachedTokens}</td>
                    <td className="px-3 py-2 text-right font-mono text-[#D4A017]">
                      {fmtUsd(e.costCents)}
                    </td>
                    <td className="px-3 py-2 text-right text-zinc-500">{e.durationMs}</td>
                    <td className="px-3 py-2 text-xs">
                      {e.success ? (
                        <span className="text-emerald-400">OK</span>
                      ) : (
                        <span className="text-red-400" title={e.errorMessage ?? ''}>
                          Error
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  tone = 'zinc',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: 'zinc' | 'gold';
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-500">
        {icon}
        {label}
      </div>
      <div className={`mt-2 text-xl font-bold ${tone === 'gold' ? 'text-[#D4A017]' : 'text-white'}`}>
        {value}
      </div>
    </div>
  );
}
