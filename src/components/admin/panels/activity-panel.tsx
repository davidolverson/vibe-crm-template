import { Panel } from '../panel';
import { Stat } from '../stat';

type ActivityStats = {
  dau: number;
  wau: number;
  recentAudit: Array<{
    id: string;
    action: string;
    entity: string;
    userId: string | null;
    tenantId: string | null;
    createdAt: string;
  }>;
};

/** UTC, compact: "2026-04-19 16:26". No client date-fns. */
function formatUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

export function ActivityPanel({ stats }: { stats: ActivityStats }) {
  const events = stats.recentAudit.slice(0, 5);

  return (
    <Panel title="Activity" meta="UTC">
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-2 gap-6">
          <Stat label="DAU" value={stats.dau.toLocaleString()} />
          <Stat label="WAU" value={stats.wau.toLocaleString()} />
        </div>

        <div>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.28em] text-[#52525B]">
            Recent audit
          </div>
          {events.length === 0 ? (
            <div className="font-mono text-[11px] text-[#52525B]">No events</div>
          ) : (
            <ul className="flex flex-col">
              {events.map((ev) => (
                <li
                  key={ev.id}
                  className="grid grid-cols-[auto_1fr] gap-x-3 border-b border-[#27272A]/60 py-2 last:border-b-0"
                >
                  <span className="font-mono text-[10px] tabular-nums uppercase tracking-[0.12em] text-[#52525B]">
                    {formatUtc(ev.createdAt)}
                  </span>
                  <span className="font-mono text-[11px] text-[#A1A1AA]">
                    <span className="text-[#FAFAFA]">{ev.action}</span>
                    <span className="text-[#52525B]"> · </span>
                    <span>{ev.entity}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Panel>
  );
}
