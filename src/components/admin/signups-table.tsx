type Signup = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  hasOrg: boolean;
};

function formatUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

export function SignupsTable({ rows }: { rows: Array<Signup> }) {
  return (
    <section className="rounded-[2px] border border-[#27272A] bg-[#18181B]">
      <header className="flex items-baseline justify-between border-b border-[#27272A] px-6 py-4">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#71717A]">
          Recent signups
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#52525B]">
          {rows.length} shown
        </span>
      </header>

      {rows.length === 0 ? (
        <div className="px-6 py-10 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-[#52525B]">
          No signups yet
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#27272A] bg-[#1F1F23]/60 text-left">
                <th
                  scope="col"
                  className="px-6 py-2.5 font-mono text-[10px] font-normal uppercase tracking-[0.24em] text-[#71717A]"
                >
                  Email
                </th>
                <th
                  scope="col"
                  className="px-6 py-2.5 font-mono text-[10px] font-normal uppercase tracking-[0.24em] text-[#71717A]"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="px-6 py-2.5 font-mono text-[10px] font-normal uppercase tracking-[0.24em] text-[#71717A]"
                >
                  Created (UTC)
                </th>
                <th
                  scope="col"
                  className="px-6 py-2.5 text-right font-mono text-[10px] font-normal uppercase tracking-[0.24em] text-[#71717A]"
                >
                  Org
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={row.id}
                  className={
                    idx % 2 === 1
                      ? 'border-b border-[#27272A]/50 bg-[#1F1F23]/40 last:border-b-0'
                      : 'border-b border-[#27272A]/50 last:border-b-0'
                  }
                >
                  <td className="px-6 py-3 font-mono text-[12px] text-[#FAFAFA]">
                    {row.email}
                  </td>
                  <td className="px-6 py-3 font-mono text-[12px] text-[#A1A1AA]">
                    {row.name ?? (
                      <span className="text-[#52525B]">--</span>
                    )}
                  </td>
                  <td className="px-6 py-3 font-mono text-[12px] tabular-nums text-[#A1A1AA]">
                    {formatUtc(row.createdAt)}
                  </td>
                  <td className="px-6 py-3 text-right font-mono text-[12px]">
                    {row.hasOrg ? (
                      <span
                        className="text-[#D4A017]"
                        aria-label="Has organization"
                      >
                        ✓
                      </span>
                    ) : (
                      <span className="text-[#52525B]">no org</span>
                    )}
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
