// Client-safe copy + enum labels for the commission-splits surface.

import type { CommissionPayeeType, CommissionSource } from '../generated/prisma/enums';

export const PAYEE_TYPE_LABELS: Record<CommissionPayeeType, string> = {
  user: 'Internal user (agent / LO / producer)',
  contact: 'Contact (referral partner or outside firm)',
  entity: 'Business entity (house account / JV)',
};

export const SOURCE_LABELS: Record<CommissionSource, string> = {
  real_estate: 'Real Estate',
  mortgage: 'Mortgage',
  insurance: 'Insurance',
  investment: 'Investment',
  other: 'Other',
};

export function bpsToPercent(bps: number): string {
  return (bps / 100).toFixed(2);
}

export function percentToBps(pct: string | number): number {
  const n = typeof pct === 'number' ? pct : Number(pct);
  if (!Number.isFinite(n)) return 0;
  return Math.round(Math.min(10000, Math.max(0, n * 100)));
}

export function fmtCents(cents: number | bigint): string {
  const n = typeof cents === 'bigint' ? Number(cents) : cents;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n / 100);
}

// Pure helper -- client + server safe. No Prisma types.
export interface SplitRow {
  id: string;
  dealId: string | null;
  source: CommissionSource;
  payeeType: CommissionPayeeType;
  payeeUserId: string | null;
  payeeContactId: string | null;
  payeeEntityId: string | null;
  payeeLabel: string;
  percentBps: number;
  amountCents: number;
  paidAt: string | null;
  note: string | null;
  createdAt: string;
}

export interface SplitTotals {
  allocatedBps: number;
  remainingBps: number;
  paidCents: number;
  unpaidCents: number;
}

export function computeTotals(
  rows: Pick<SplitRow, 'percentBps' | 'amountCents' | 'paidAt'>[]
): SplitTotals {
  let allocated = 0;
  let paid = 0;
  let unpaid = 0;
  for (const r of rows) {
    allocated += r.percentBps;
    if (r.paidAt) paid += r.amountCents;
    else unpaid += r.amountCents;
  }
  return {
    allocatedBps: allocated,
    remainingBps: Math.max(0, 10000 - allocated),
    paidCents: paid,
    unpaidCents: unpaid,
  };
}
