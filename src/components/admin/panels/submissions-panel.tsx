import type { RecentSubmission } from '@/lib/public-submissions';
import { Panel } from '../panel';

type Props = {
  rows: RecentSubmission[];
};

function fmtLocal(iso: string): string {
  // "2026-04-19T20:45:00Z" -> "Apr 19 20:45 UTC"
  try {
    const d = new Date(iso);
    const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
    const day = d.getUTCDate().toString().padStart(2, '0');
    const hh = d.getUTCHours().toString().padStart(2, '0');
    const mm = d.getUTCMinutes().toString().padStart(2, '0');
    return `${month} ${day} ${hh}:${mm} UTC`;
  } catch {
    return iso;
  }
}

function kindLabel(k: RecentSubmission['kind']): string {
  return k === 'contact' ? 'CONTACT' : 'WAITLIST';
}

export function SubmissionsPanel({ rows }: Props) {
  const waitlist = rows.filter((r) => r.kind === 'waitlist').length;
  const contact = rows.filter((r) => r.kind === 'contact').length;

  return (
    <Panel
      title="Public Submissions"
      meta={`${waitlist} waitlist · ${contact} contact (last 50)`}
    >
      {rows.length === 0 ? (
        <p className="font-mono text-[11px] uppercase tracking-wider text-[#71717A]">
          No submissions yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#27272A] text-left">
                <th className="pb-3 pr-4 font-mono text-[10px] uppercase tracking-wider text-[#71717A]">
                  Kind
                </th>
                <th className="pb-3 pr-4 font-mono text-[10px] uppercase tracking-wider text-[#71717A]">
                  Email
                </th>
                <th className="pb-3 pr-4 font-mono text-[10px] uppercase tracking-wider text-[#71717A]">
                  Context
                </th>
                <th className="pb-3 pr-4 font-mono text-[10px] uppercase tracking-wider text-[#71717A]">
                  Message
                </th>
                <th className="pb-3 pr-0 text-right font-mono text-[10px] uppercase tracking-wider text-[#71717A]">
                  When
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-[#18181B] last:border-b-0"
                >
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] tracking-wider uppercase ${
                        r.kind === 'contact'
                          ? 'bg-[#D4A017]/15 text-[#D4A017]'
                          : 'bg-[#27272A] text-[#A1A1AA]'
                      }`}
                    >
                      {kindLabel(r.kind)}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-[#FAFAFA]">
                    {r.name ? (
                      <span className="block text-xs text-[#71717A]">
                        {r.name}
                      </span>
                    ) : null}
                    <a
                      href={`mailto:${r.email}`}
                      className="hover:text-[#D4A017] transition-colors"
                    >
                      {r.email}
                    </a>
                  </td>
                  <td className="py-3 pr-4 text-[#A1A1AA]">{r.context}</td>
                  <td className="py-3 pr-4 text-[#A1A1AA] max-w-md truncate">
                    {r.message ?? '--'}
                  </td>
                  <td className="py-3 pr-0 text-right font-mono text-[11px] text-[#71717A] whitespace-nowrap">
                    {fmtLocal(r.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
