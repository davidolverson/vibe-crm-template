import { Panel } from '../panel';
import { Stat } from '../stat';
import { SignupChart } from '../signup-chart';

type SignupStats = {
  total: number;
  last7d: number;
  last30d: number;
  daily: Array<{ date: string; count: number }>;
};

export function SignupsPanel({ stats }: { stats: SignupStats }) {
  return (
    <Panel title="Signups" meta={`${stats.daily.length}d window`}>
      <div className="flex flex-col gap-6">
        <Stat
          label="Total users"
          value={stats.total.toLocaleString()}
          sub={
            <span>
              <span className="text-[#FAFAFA]">+{stats.last7d}</span> last 7d ·{' '}
              <span className="text-[#FAFAFA]">+{stats.last30d}</span> last 30d
            </span>
          }
        />
        <SignupChart daily={stats.daily} />
      </div>
    </Panel>
  );
}
