'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Users,
  Kanban,
  DollarSign,
  AlertCircle,
  Activity,
  GitBranch,
  CalendarDays,
  CheckCircle2,
  Circle,
  X,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecentActivity {
  id: string;
  type: string;
  body: string | null;
  createdAt: string;
  contactName: string;
}

interface StageCount {
  name: string;
  position: number;
  count: number;
}

interface StatusCount {
  status: string;
  count: number;
}

interface DashboardData {
  contactCount: number;
  dealCount: number;
  overdueTaskCount: number;
  taskCount: number;
  formCount: number;
  submissionCount: number;
  pipelineValue: number;
  recentActivities: RecentActivity[];
  pipelineDistribution: StageCount[];
  contactDistribution: StatusCount[];
  tasksByDay: number[]; // length 7, Mon=0 ... Sun=6
  weekStartIso: string;
}

interface Props {
  data: DashboardData;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatActivityType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Ordered contact statuses with display labels and accent colors
const CONTACT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new:       { label: 'New',       color: '#6B7280' },
  contacted: { label: 'Contacted', color: '#3B82F6' },
  qualified: { label: 'Qualified', color: '#8B5CF6' },
  nurturing: { label: 'Nurturing', color: '#F59E0B' },
  customer:  { label: 'Customer',  color: '#10B981' },
  lost:      { label: 'Lost',      color: '#EF4444' },
};

const CONTACT_STATUS_ORDER = ['new', 'contacted', 'qualified', 'nurturing', 'customer', 'lost'];

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ---------------------------------------------------------------------------
// Onboarding checklist
// ---------------------------------------------------------------------------

const DISMISS_KEY = 'vibe-onboarding-dismissed';

interface ChecklistItem {
  label: string;
  href: string;
  done: boolean;
}

function buildChecklistItems(data: DashboardData): ChecklistItem[] {
  return [
    {
      label: 'Add your first contact',
      href: '/contacts',
      done: data.contactCount > 0,
    },
    {
      label: 'Create a deal',
      href: '/pipeline',
      done: data.dealCount > 0,
    },
    {
      label: 'Create a task',
      href: '/tasks',
      done: data.taskCount > 0,
    },
    {
      label: 'Set up a lead form',
      href: '/forms',
      done: data.formCount > 0,
    },
    {
      label: 'Get your first lead',
      href: '/forms',
      done: data.submissionCount > 0,
    },
    {
      label: 'Invite a team member',
      href: '/settings',
      done: false,
    },
  ];
}

function OnboardingChecklist({ data }: { data: DashboardData }) {
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    // localStorage is client-only, so this must run after mount (deliberately
    // deferred to avoid a hydration mismatch — see the `dismissed === null` guard).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(localStorage.getItem(DISMISS_KEY) === 'true');
  }, []);

  const items = buildChecklistItems(data);
  const completedCount = items.filter((i) => i.done).length;

  // Hide once every item is done (currently 6) or the user dismisses
  if (dismissed === null) return null; // avoid hydration mismatch
  if (dismissed) return null;
  if (completedCount >= items.length) return null;

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, 'true');
    setDismissed(true);
  }

  const progressPct = Math.round((completedCount / items.length) * 100);

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Getting started
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {completedCount} of {items.length} steps completed
          </p>
        </div>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss checklist"
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progressPct}%`, backgroundColor: '#D4A017' }}
        />
      </div>

      {/* Checklist items */}
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors group ${
                item.done
                  ? 'opacity-50 cursor-default pointer-events-none'
                  : 'hover:bg-muted'
              }`}
            >
              {item.done ? (
                <CheckCircle2 className="size-4 shrink-0 text-[#D4A017]" />
              ) : (
                <Circle className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
              )}
              <span
                className={`text-sm ${
                  item.done
                    ? 'line-through text-muted-foreground'
                    : 'text-foreground'
                }`}
              >
                {item.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat cards config
// ---------------------------------------------------------------------------

const STAT_CARDS = [
  {
    key: 'contacts' as const,
    label: 'Total Contacts',
    icon: Users,
    getValue: (d: DashboardData) => d.contactCount.toLocaleString(),
    highlight: false,
  },
  {
    key: 'deals' as const,
    label: 'Active Deals',
    icon: Kanban,
    getValue: (d: DashboardData) => d.dealCount.toLocaleString(),
    highlight: false,
  },
  {
    key: 'pipeline' as const,
    label: 'Pipeline Value',
    icon: DollarSign,
    getValue: (d: DashboardData) => formatCurrency(d.pipelineValue),
    highlight: true,
  },
  {
    key: 'tasks' as const,
    label: 'Overdue Tasks',
    icon: AlertCircle,
    getValue: (d: DashboardData) => d.overdueTaskCount.toLocaleString(),
    highlight: false,
    danger: true,
  },
];

// ---------------------------------------------------------------------------
// Chart sub-components
// ---------------------------------------------------------------------------

/** Horizontal bar chart showing open deals per pipeline stage */
function PipelineFunnel({ stages }: { stages: StageCount[] }) {
  if (stages.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No open deals yet.
      </p>
    );
  }

  const maxCount = Math.max(...stages.map((s) => s.count));

  return (
    <div className="space-y-3">
      {stages.map((stage) => {
        const pct = maxCount > 0 ? Math.max((stage.count / maxCount) * 100, 4) : 0;
        return (
          <div key={stage.name} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium truncate max-w-[60%]">
                {stage.name}
              </span>
              <span className="text-foreground font-semibold tabular-nums">
                {stage.count} deal{stage.count !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="h-6 w-full rounded bg-muted overflow-hidden">
              <div
                className="h-full rounded transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  backgroundColor: '#D4A017',
                  opacity: 0.85 + (stage.count / (maxCount * 5)),
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Stat cards per contact status */
function ContactBreakdown({ distribution }: { distribution: StatusCount[] }) {
  const totalContacts = distribution.reduce((sum, d) => sum + d.count, 0);

  if (totalContacts === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No contacts yet.
      </p>
    );
  }

  // Merge DB results with full status list so all statuses render (count = 0 for missing)
  const merged = CONTACT_STATUS_ORDER.map((status) => {
    const found = distribution.find((d) => d.status === status);
    return { status, count: found?.count ?? 0 };
  });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {merged.map(({ status, count }) => {
        const config = CONTACT_STATUS_CONFIG[status] ?? {
          label: capitalize(status),
          color: '#6B7280',
        };
        const pct = totalContacts > 0 ? Math.round((count / totalContacts) * 100) : 0;

        return (
          <div
            key={status}
            className="rounded-lg border border-border bg-card p-3 flex flex-col gap-1"
          >
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block size-2 rounded-full shrink-0"
                style={{ backgroundColor: config.color }}
              />
              <span className="text-xs text-muted-foreground font-medium">
                {config.label}
              </span>
            </div>
            <p className="text-xl font-black text-foreground tabular-nums leading-none">
              {count}
            </p>
            <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: config.color }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{pct}%</p>
          </div>
        );
      })}
    </div>
  );
}

/** 7-day mini bar chart Mon-Sun */
function WeeklyTaskChart({
  tasksByDay,
  weekStartIso,
}: {
  tasksByDay: number[];
  weekStartIso: string;
}) {
  const totalTasks = tasksByDay.reduce((a, b) => a + b, 0);
  const maxCount = Math.max(...tasksByDay, 1); // avoid division by zero

  // Derive which column index is today
  const todayDay = new Date().getDay(); // 0=Sun
  const todayIdx = todayDay === 0 ? 6 : todayDay - 1; // Mon=0 ... Sun=6

  // Build date labels Mon-Sun from weekStart
  const weekStart = new Date(weekStartIso);
  const dayLabels = WEEK_DAYS.map((abbr, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return {
      abbr,
      date: d.getDate(),
      isToday: i === todayIdx,
    };
  });

  if (totalTasks === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No tasks due this week.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {/* Bar chart */}
      <div className="flex items-end gap-1.5 h-24">
        {tasksByDay.map((count, i) => {
          const heightPct = Math.max((count / maxCount) * 100, count > 0 ? 8 : 0);
          const isToday = i === todayIdx;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end gap-0.5"
            >
              {count > 0 && (
                <span className="text-[10px] text-muted-foreground tabular-nums leading-none">
                  {count}
                </span>
              )}
              <div
                className="w-full rounded-t transition-all duration-500"
                style={{
                  height: `${heightPct}%`,
                  backgroundColor: isToday ? '#D4A017' : '#D4A01740',
                  outline: isToday ? '1.5px solid #D4A017' : 'none',
                  minHeight: count > 0 ? '4px' : '0px',
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Day labels */}
      <div className="flex gap-1.5">
        {dayLabels.map(({ abbr, date, isToday }, i) => (
          <div
            key={i}
            className="flex-1 flex flex-col items-center"
          >
            <span
              className={`text-[10px] font-medium leading-none ${
                isToday ? 'text-[#D4A017]' : 'text-muted-foreground'
              }`}
            >
              {abbr}
            </span>
            <span
              className={`text-[10px] leading-none mt-0.5 ${
                isToday ? 'text-[#D4A017] font-bold' : 'text-muted-foreground'
              }`}
            >
              {date}
            </span>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-right">
        {totalTasks} task{totalTasks !== 1 ? 's' : ''} due this week
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DashboardClient({ data }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of your workspace
        </p>
      </div>

      {/* Onboarding checklist -- auto-hides when all items complete or dismissed */}
      <OnboardingChecklist data={data} />

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ key, label, icon: Icon, getValue, highlight, danger }) => (
          <Card key={key}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {label}
                </CardTitle>
                <Icon
                  className={`size-4 ${
                    danger
                      ? 'text-destructive'
                      : highlight
                      ? 'text-[#D4A017]'
                      : 'text-muted-foreground'
                  }`}
                />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p
                className={`text-2xl font-black ${
                  danger && data.overdueTaskCount > 0
                    ? 'text-destructive'
                    : highlight
                    ? 'text-[#D4A017]'
                    : 'text-foreground'
                }`}
              >
                {getValue(data)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-[#D4A017]" />
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {data.recentActivities.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No activity yet. Start by adding contacts.
            </p>
          ) : (
            <ul className="space-y-3">
              {data.recentActivities.map((activity) => (
                <li
                  key={activity.id}
                  className="flex items-start justify-between gap-4 py-2 border-b border-border last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {formatActivityType(activity.type)}{' '}
                      <span className="text-muted-foreground font-normal">
                        with {activity.contactName}
                      </span>
                    </p>
                    {activity.body && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {activity.body}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {formatRelativeTime(activity.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Analytics row: Pipeline funnel + Weekly tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pipeline stage funnel */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <GitBranch className="size-4 text-[#D4A017]" />
              <CardTitle className="text-base">Pipeline by Stage</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              Open deals per pipeline stage
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <PipelineFunnel stages={data.pipelineDistribution} />
          </CardContent>
        </Card>

        {/* Weekly task chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 text-[#D4A017]" />
              <CardTitle className="text-base">Tasks This Week</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              Due by day, Mon - Sun
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <WeeklyTaskChart
              tasksByDay={data.tasksByDay}
              weekStartIso={data.weekStartIso}
            />
          </CardContent>
        </Card>
      </div>

      {/* Contact status breakdown */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="size-4 text-[#D4A017]" />
            <CardTitle className="text-base">Contact Breakdown</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Distribution across all contact statuses
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <ContactBreakdown distribution={data.contactDistribution} />
        </CardContent>
      </Card>
    </div>
  );
}
