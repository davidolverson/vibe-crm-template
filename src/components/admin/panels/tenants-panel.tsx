import { Panel } from '../panel';
import { Stat } from '../stat';

type TenantStats = {
  total: number;
  byPlan: Array<{ plan: string; count: number }>;
  bySubscriptionStatus: Array<{ status: string; count: number }>;
  recent: Array<{ id: string; name: string; plan: string; createdAt: string }>;
};

function BreakdownRow({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center justify-between border-b border-[#27272A]/60 py-2 last:border-b-0">
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#A1A1AA]">
        {label || 'unknown'}
      </span>
      <span className="font-mono text-[12px] tabular-nums text-[#FAFAFA]">
        {count.toLocaleString()}
      </span>
    </div>
  );
}

export function TenantsPanel({ stats }: { stats: TenantStats }) {
  return (
    <Panel title="Tenants" meta={`${stats.byPlan.length} plans`}>
      <div className="flex flex-col gap-6">
        <Stat label="Total tenants" value={stats.total.toLocaleString()} />

        <div>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.28em] text-[#52525B]">
            By plan
          </div>
          <div>
            {stats.byPlan.length === 0 ? (
              <div className="font-mono text-[11px] text-[#52525B]">No plans</div>
            ) : (
              stats.byPlan.map((row) => (
                <BreakdownRow key={`plan-${row.plan}`} label={row.plan} count={row.count} />
              ))
            )}
          </div>
        </div>

        <div>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.28em] text-[#52525B]">
            Subscription status
          </div>
          <div>
            {stats.bySubscriptionStatus.length === 0 ? (
              <div className="font-mono text-[11px] text-[#52525B]">No subscriptions</div>
            ) : (
              stats.bySubscriptionStatus.map((row) => (
                <BreakdownRow
                  key={`sub-${row.status}`}
                  label={row.status}
                  count={row.count}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}
