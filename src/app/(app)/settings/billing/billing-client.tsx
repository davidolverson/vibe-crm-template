'use client';

import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';
import { PLANS, PLAN_ORDER, type PlanDef } from '@/lib/plans';
import type { BillingData } from './actions';
import { createCheckoutSession, createPortalSession } from './actions';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatLimit(n: number): string {
  if (n >= 100000) return '100k';
  if (n >= 1000) return `${n / 1000}k`;
  return String(n);
}

function usagePct(current: number, max: number): number {
  if (max === 0) return 0;
  return Math.min(100, Math.round((current / max) * 100));
}

function planRank(planId: string): number {
  return PLAN_ORDER.indexOf(planId as (typeof PLAN_ORDER)[number]);
}

// ---------------------------------------------------------------------------
// UsageBar
// ---------------------------------------------------------------------------

function UsageBar({ label, current, max }: { label: string; current: number; max: number }) {
  const pct = usagePct(current, max);
  const color =
    pct >= 90
      ? 'bg-red-500'
      : pct >= 70
        ? 'bg-amber-500'
        : 'bg-[#D4A017]';

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-zinc-400">
        <span>{label}</span>
        <span>
          {current.toLocaleString()} / {max.toLocaleString()}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PlanCard
// ---------------------------------------------------------------------------

interface PlanCardProps {
  plan: PlanDef;
  isCurrent: boolean;
  isUpgrade: boolean;
  isDowngrade: boolean;
  canEdit: boolean;
  onUpgrade: (planId: string) => void;
  pending: boolean;
  activePlanId: string;
}

function PlanCard({
  plan,
  isCurrent,
  isUpgrade,
  isDowngrade,
  canEdit,
  onUpgrade,
  pending,
  activePlanId,
}: PlanCardProps) {
  const isPro = plan.id === 'pro';
  const borderClass = isCurrent
    ? 'border-[#D4A017]'
    : isPro
      ? 'border-violet-600'
      : 'border-zinc-800';

  return (
    <Card className={`bg-zinc-900 ${borderClass} relative flex flex-col`}>
      {isPro && !isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-violet-600 text-white text-xs font-semibold px-3 py-0.5 rounded-full">
            Most Popular
          </span>
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-white text-lg">{plan.name}</CardTitle>
            <CardDescription className="text-zinc-500 text-sm mt-0.5">
              {plan.description}
            </CardDescription>
          </div>
          {isCurrent && (
            <Badge className="border-[#D4A017] text-[#D4A017] bg-transparent text-xs shrink-0">
              Current
            </Badge>
          )}
        </div>
        <p className="text-2xl font-bold text-white mt-2">{plan.priceLabel}</p>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 flex-1">
        {/* Limits */}
        <ul className="space-y-1.5 text-sm text-zinc-400">
          <li className="flex items-center gap-2">
            <span className="text-zinc-600">Users</span>
            <span className="ml-auto text-zinc-200">
              Up to {formatLimit(plan.limits.maxUsers)}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-zinc-600">Contacts</span>
            <span className="ml-auto text-zinc-200">
              {formatLimit(plan.limits.maxContacts)}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-zinc-600">Sequences</span>
            <span className="ml-auto text-zinc-200">
              {formatLimit(plan.limits.maxSequences)}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-zinc-600">Sites</span>
            <span className="ml-auto text-zinc-200">
              {formatLimit(plan.limits.maxSites)}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-zinc-600">Emails/mo</span>
            <span className="ml-auto text-zinc-200">
              {formatLimit(plan.limits.maxMonthlyEmails)}
            </span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-zinc-600">SMS/mo</span>
            <span className="ml-auto text-zinc-200">
              {formatLimit(plan.limits.maxMonthlyMessages)}
            </span>
          </li>
        </ul>

        {/* Action */}
        <div className="mt-auto pt-2">
          {isCurrent ? (
            <Button
              variant="outline"
              className="w-full border-zinc-700 text-zinc-400 cursor-default"
              disabled
            >
              Active plan
            </Button>
          ) : isUpgrade ? (
            <Button
              className="w-full bg-[#D4A017] hover:bg-[#D4A017]/90 text-black font-semibold"
              disabled={!canEdit || pending}
              onClick={() => onUpgrade(plan.id)}
            >
              {pending && activePlanId === plan.id ? 'Redirecting...' : `Upgrade to ${plan.name}`}
            </Button>
          ) : (
            <Button
              variant="outline"
              className="w-full border-zinc-700 text-zinc-500"
              disabled
              title="Contact support to downgrade"
            >
              {isDowngrade ? 'Contact support to downgrade' : 'Not available'}
            </Button>
          )}
          {!canEdit && isUpgrade && (
            <p className="text-xs text-zinc-600 text-center mt-1">
              Owner permissions required
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// StatusBanner
// ---------------------------------------------------------------------------

// Whole days from now until `date` (never negative). Module-scoped so the
// Date.now() read is outside any render body.
function daysUntil(date: Date): number {
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86400000));
}

function StatusBanner({ billing }: { billing: BillingData }) {
  const status = billing.subscriptionStatus;

  if (status === 'trialing' && billing.trialEndsAt) {
    const end = new Date(billing.trialEndsAt);
    const daysLeft = daysUntil(end);
    return (
      <div className="rounded-lg border border-amber-700 bg-amber-950/30 px-4 py-3 text-sm text-amber-300">
        Trial ends in {daysLeft} day{daysLeft !== 1 ? 's' : ''} ({end.toLocaleDateString()}).
        Upgrade to keep full access.
      </div>
    );
  }

  if (status === 'past_due') {
    return (
      <div className="rounded-lg border border-red-700 bg-red-950/30 px-4 py-3 text-sm text-red-300">
        Your payment is past due. Update your billing info to avoid service interruption.
      </div>
    );
  }

  if (status === 'canceled') {
    return (
      <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-400">
        Your subscription has been canceled. You are on the Free plan.
      </div>
    );
  }

  if (status === 'active' && billing.currentPeriodEnd) {
    const end = new Date(billing.currentPeriodEnd);
    return (
      <div className="rounded-lg border border-emerald-800 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">
        Active subscription. Next billing date: {end.toLocaleDateString()}.
      </div>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------

interface Props {
  billing: BillingData;
  stripeConfigured: boolean;
}

export function BillingClient({ billing, stripeConfigured }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activePlanId, setActivePlanId] = useState('');

  const currentRank = planRank(billing.plan);

  function handleUpgrade(planId: string) {
    setActivePlanId(planId);
    startTransition(async () => {
      const result = await createCheckoutSession(planId);
      if (!result.success) {
        toast.error(result.error);
        setActivePlanId('');
        return;
      }
      window.location.href = result.data.url;
    });
  }

  function handleManage() {
    setActivePlanId('portal');
    startTransition(async () => {
      const result = await createPortalSession();
      if (!result.success) {
        toast.error(result.error);
        setActivePlanId('');
        return;
      }
      window.location.href = result.data.url;
    });
  }

  if (!stripeConfigured) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Billing</h2>
          <p className="text-sm text-zinc-500 mt-1">Plan and subscription management</p>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-6 py-10 text-center">
          <p className="text-zinc-300 text-sm font-medium">You are on your Founding 50 preview</p>
          <p className="text-zinc-500 text-xs mt-1">
            Full billing management opens when paid plans launch. Your Founding 50 pricing is locked in.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Billing</h2>
          <p className="text-sm text-zinc-500 mt-1">Plan and subscription management</p>
        </div>
        {billing.stripeCustomerId && (
          <Button
            variant="outline"
            size="sm"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            disabled={pending}
            onClick={handleManage}
          >
            {pending && activePlanId === 'portal' ? 'Opening...' : 'Manage Subscription'}
          </Button>
        )}
      </div>

      <StatusBanner billing={billing} />

      {/* Usage */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-3">
        <p className="text-sm font-medium text-zinc-300">Current Usage</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <UsageBar
            label="Contacts"
            current={billing.usage.contacts.current}
            max={billing.usage.contacts.max}
          />
          <UsageBar
            label="Users"
            current={billing.usage.users.current}
            max={billing.usage.users.max}
          />
          <UsageBar
            label="Sequences"
            current={billing.usage.sequences.current}
            max={billing.usage.sequences.max}
          />
          <UsageBar
            label="Sites"
            current={billing.usage.sites.current}
            max={billing.usage.sites.max}
          />
        </div>
      </div>

      {/* Plan grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 pt-2">
        {PLAN_ORDER.map((planId) => {
          const plan = PLANS[planId];
          const rank = planRank(planId);
          return (
            <PlanCard
              key={planId}
              plan={plan}
              isCurrent={billing.plan === planId}
              isUpgrade={rank > currentRank}
              isDowngrade={rank < currentRank}
              canEdit={billing.canEdit}
              onUpgrade={handleUpgrade}
              pending={pending}
              activePlanId={activePlanId}
            />
          );
        })}
      </div>

      <p className="text-xs text-zinc-600">
        Payments are processed securely via Stripe. Upgrade takes effect immediately.
        To downgrade or cancel, use Manage Subscription.
      </p>
    </div>
  );
}
