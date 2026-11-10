// Client-safe copy/defaults for the financial-alerts surface. Split from
// src/lib/alerts.ts so it can be imported by client components without
// pulling in the Prisma client (Turbopack otherwise tries to chunk it
// into the browser bundle and fails on `node:module`).

import type { AlertRuleType } from '../generated/prisma/enums';

export interface AlertRuleSeed {
  type: AlertRuleType;
  thresholdValue: number;
  thresholdUnit: 'percent' | 'days' | 'amount';
}

export const DEFAULT_ALERT_RULES: AlertRuleSeed[] = [
  { type: 'revenue_drop', thresholdValue: 20, thresholdUnit: 'percent' },
  { type: 'ar_aging', thresholdValue: 10000, thresholdUnit: 'amount' },
  { type: 'invoice_overdue', thresholdValue: 30, thresholdUnit: 'days' },
  { type: 'payment_received', thresholdValue: 5000, thresholdUnit: 'amount' },
];

export const ALERT_RULE_COPY: Record<
  AlertRuleType,
  {
    title: string;
    description: string;
    thresholdLabel: string;
    unitOptions: Array<'percent' | 'days' | 'amount'>;
  }
> = {
  revenue_drop: {
    title: 'Revenue drop (month-over-month)',
    description: "Fires when this month's collected revenue drops by the threshold % vs last month.",
    thresholdLabel: 'Minimum drop',
    unitOptions: ['percent'],
  },
  ar_aging: {
    title: 'Outstanding AR aging',
    description: 'Fires when total balance on invoices past due by N days meets or exceeds the amount.',
    thresholdLabel: 'Dollar amount',
    unitOptions: ['amount', 'days'],
  },
  invoice_overdue: {
    title: 'Invoice overdue',
    description: 'Fires when any invoice is overdue by the threshold number of days.',
    thresholdLabel: 'Days overdue',
    unitOptions: ['days'],
  },
  payment_received: {
    title: 'Large payment received',
    description: 'Fires when a payment at or above the threshold lands in QuickBooks within 24 hours.',
    thresholdLabel: 'Dollar amount',
    unitOptions: ['amount'],
  },
};
