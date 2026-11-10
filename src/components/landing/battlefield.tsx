import { Check } from 'lucide-react';
import { Reveal } from './reveal';

type Cell = 'yes' | 'no' | 'partial' | 'addon' | 'locked' | string;

const features: Array<{ label: string; cells: Cell[] }> = [
  {
    label: 'Unified leads across business lines',
    cells: ['no', 'no', 'no', 'no', 'yes'],
  },
  {
    label: 'Multi-site lead engine (one backend)',
    cells: ['no', 'no', 'no', 'no', 'yes'],
  },
  {
    label: 'QuickBooks hourly sync',
    cells: ['no', 'no', 'no', 'no', 'yes'],
  },
  {
    label: 'CEO + CFO dashboards',
    cells: ['no', 'no', 'no', 'no', 'yes'],
  },
  {
    label: 'Built-in SMS, call, and email',
    cells: ['partial', 'yes', 'no', 'no', 'yes'],
  },
  {
    label: 'IDX listings',
    cells: ['addon', 'addon', 'locked', 'yes', 'yes'],
  },
  {
    label: 'Multi-tenant (multiple entities)',
    cells: ['no', 'no', 'no', 'no', 'yes'],
  },
  {
    label: 'Price (team of 5)',
    cells: ['~$345/mo', '~$75/mo', '~$500/mo', '~$300/mo', 'From $600/mo*'],
  },
];

const competitors = ['Follow Up Boss', 'LionDesk', 'CINC', 'Sierra', 'VIBE'];

function renderCell(value: Cell, isVibe: boolean) {
  if (value === 'yes') {
    return isVibe ? (
      <Check
        className="w-5 h-5 vibe-gold mx-auto"
        strokeWidth={2.25}
        aria-label="Yes"
      />
    ) : (
      <span className="text-emerald-600/90 tabular-nums">Yes</span>
    );
  }
  if (value === 'no') {
    return <span className="text-zinc-300">--</span>;
  }
  if (value === 'partial') {
    return <span className="text-zinc-500 text-xs">Partial</span>;
  }
  if (value === 'addon') {
    return <span className="text-zinc-500 text-xs">Add-on</span>;
  }
  if (value === 'locked') {
    return <span className="text-zinc-500 text-xs">Locked-in</span>;
  }
  return <span className="text-zinc-900 tabular-nums text-sm">{value}</span>;
}

export function Battlefield() {
  return (
    <section
      id="battlefield"
      className="vibe-bone relative py-24 px-6 text-zinc-900"
    >
      <div className="max-w-6xl mx-auto">
        <Reveal>
          <div className="mb-12 max-w-2xl">
            <p className="vibe-eyebrow mb-4" style={{ color: '#8C6A0F' }}>
              Section 04 -- Competitor battlefield
            </p>
            <h2 className="vibe-headline text-[clamp(32px,4.5vw,56px)]">
              What you&rsquo;re paying for.
              <br />
              <span style={{ color: '#8C6A0F' }} className="italic">
                What you&rsquo;re missing.
              </span>
            </h2>
          </div>
        </Reveal>

        <Reveal delayMs={120}>
        <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200">
                <th className="text-left py-5 px-6 font-mono text-[11px] uppercase tracking-wider text-zinc-500 font-medium">
                  Feature
                </th>
                {competitors.map((c) => {
                  const isVibe = c === 'VIBE';
                  return (
                    <th
                      key={c}
                      className={`py-5 px-4 font-mono text-[11px] uppercase tracking-wider font-medium text-center ${
                        isVibe
                          ? 'vibe-gold border-l border-[#D4A017]/40'
                          : 'text-zinc-400'
                      }`}
                      style={
                        isVibe
                          ? { background: 'rgba(212, 160, 23, 0.06)' }
                          : undefined
                      }
                    >
                      {c}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {features.map((row, ri) => (
                <tr
                  key={ri}
                  className="border-b border-zinc-100 last:border-b-0"
                >
                  <td className="py-4 px-6 text-zinc-700">{row.label}</td>
                  {row.cells.map((cell, ci) => {
                    const isVibe = ci === row.cells.length - 1;
                    return (
                      <td
                        key={ci}
                        className={`py-4 px-4 text-center ${
                          isVibe
                            ? 'border-l border-[#D4A017]/30'
                            : 'text-zinc-400'
                        }`}
                        style={
                          isVibe
                            ? { background: 'rgba(212, 160, 23, 0.06)' }
                            : undefined
                        }
                      >
                        {renderCell(cell, isVibe)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        </Reveal>

        <p className="mt-4 text-xs text-zinc-500 font-mono">
          * Founding member pricing -- 40% off Year 1.
        </p>
      </div>
    </section>
  );
}
