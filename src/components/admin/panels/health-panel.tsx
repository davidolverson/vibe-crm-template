import { Panel } from '../panel';
import { Stat } from '../stat';

type HealthStats = {
  failedLoginsLast24h: number;
  webhookFailuresLast24h: number;
  dbLatencyMs: number;
};

type Tone = 'success' | 'warning' | 'error' | undefined;

function failureTone(count: number): Tone {
  if (count === 0) return undefined;
  if (count > 20) return 'error';
  return 'warning';
}

function latencyTone(ms: number): Tone {
  if (ms > 2000) return 'error';
  if (ms > 500) return 'warning';
  return undefined;
}

export function HealthPanel({ stats }: { stats: HealthStats }) {
  return (
    <Panel title="Health" meta="Last 24h">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Stat
          label="Failed logins"
          value={stats.failedLoginsLast24h.toLocaleString()}
          tone={failureTone(stats.failedLoginsLast24h)}
          sub="24h"
        />
        <Stat
          label="Webhook failures"
          value={stats.webhookFailuresLast24h.toLocaleString()}
          tone={failureTone(stats.webhookFailuresLast24h)}
          sub="24h"
        />
        <Stat
          label="DB latency"
          value={
            <span>
              {stats.dbLatencyMs.toLocaleString()}
              <span className="ml-1 font-mono text-[12px] tracking-wide text-[#71717A]">
                ms
              </span>
            </span>
          }
          tone={latencyTone(stats.dbLatencyMs)}
          sub="p50"
        />
      </div>
    </Panel>
  );
}
