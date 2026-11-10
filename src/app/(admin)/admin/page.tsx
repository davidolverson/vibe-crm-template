import {
  getActivityStats,
  getHealthStats,
  getRecentSignups,
  getSignupStats,
  getTenantStats,
} from '@/lib/admin-queries';
import { getRecentSubmissions } from '@/lib/public-submissions';
import { SignupsPanel } from '@/components/admin/panels/signups-panel';
import { TenantsPanel } from '@/components/admin/panels/tenants-panel';
import { ActivityPanel } from '@/components/admin/panels/activity-panel';
import { HealthPanel } from '@/components/admin/panels/health-panel';
import { SubmissionsPanel } from '@/components/admin/panels/submissions-panel';
import { SignupsTable } from '@/components/admin/signups-table';

export const dynamic = 'force-dynamic';

/** "2026-04-19 16:26 UTC" -- pure, no client libs. */
function nowStamp(): string {
  const iso = new Date().toISOString();
  return `${iso.slice(0, 16).replace('T', ' ')} UTC`;
}

export default async function AdminDashboardPage() {
  const [signups, tenants, activity, health, recent, submissions] = await Promise.all([
    getSignupStats(),
    getTenantStats(),
    getActivityStats(),
    getHealthStats(),
    getRecentSignups(10),
    getRecentSubmissions(50),
  ]);

  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA]">
      <div className="mx-auto w-full max-w-[1400px] px-6 pb-16 pt-10 sm:px-10">
        <header className="mb-10 flex flex-col gap-3 border-b border-[#27272A] pb-8">
          <span className="font-mono text-[10px] uppercase tracking-[0.34em] text-[#D4A017]">
            VIBE · PLATFORM
          </span>
          <h1 className="font-display text-[48px] font-semibold leading-[1.05] tracking-tight text-[#FAFAFA] sm:text-[56px]">
            Control room.
          </h1>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#71717A]">
            As of {nowStamp()}
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SignupsPanel stats={signups} />
          <TenantsPanel stats={tenants} />
          <ActivityPanel stats={activity} />
          <HealthPanel stats={health} />
        </div>

        <div className="mt-6">
          <SubmissionsPanel rows={submissions} />
        </div>

        <div className="mt-6">
          <SignupsTable rows={recent} />
        </div>
      </div>
    </div>
  );
}
