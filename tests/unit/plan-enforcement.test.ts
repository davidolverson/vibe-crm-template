/**
 * Unit tests for the pure trial-expiry decision in src/lib/plan-enforcement.ts.
 * getEffectivePlan() is the gate that decides whether a tenant keeps their paid
 * features — an off-by-one here either bills-block a paying customer or hands a
 * lapsed trial the paid tier for free. resolveEffectivePlan() is the DB-free
 * core it delegates to; time is injected so expiry is deterministic.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveEffectivePlan } from '../../src/lib/plan-enforcement';

const now = new Date('2026-07-07T12:00:00Z');
const future = new Date('2026-08-01T00:00:00Z');
const past = new Date('2026-06-01T00:00:00Z');

test('no tenant resolves to free', () => {
  assert.equal(resolveEffectivePlan(null, now), 'free');
});

test('an active subscription uses the tenant plan', () => {
  assert.equal(
    resolveEffectivePlan({ plan: 'pro', subscriptionStatus: 'active', trialEndsAt: null }, now),
    'pro',
  );
});

test('trialing with an unexpired trial keeps the tenant plan', () => {
  assert.equal(
    resolveEffectivePlan({ plan: 'starter', subscriptionStatus: 'trialing', trialEndsAt: future }, now),
    'starter',
  );
});

test('trialing with an expired trial (or no end date) falls back to free', () => {
  assert.equal(
    resolveEffectivePlan({ plan: 'starter', subscriptionStatus: 'trialing', trialEndsAt: past }, now),
    'free',
  );
  assert.equal(
    resolveEffectivePlan({ plan: 'starter', subscriptionStatus: 'trialing', trialEndsAt: null }, now),
    'free',
  );
});

test('past_due / canceled / unpaid / unknown all fall back to free', () => {
  for (const status of ['past_due', 'canceled', 'unpaid', 'incomplete', null]) {
    assert.equal(
      resolveEffectivePlan({ plan: 'enterprise', subscriptionStatus: status, trialEndsAt: future }, now),
      'free',
      `status=${status}`,
    );
  }
});

test('expiry uses strict "greater than now" at the boundary', () => {
  const t = new Date('2026-07-07T12:00:00Z');
  // trial ends exactly at now -> not strictly after -> free
  assert.equal(
    resolveEffectivePlan({ plan: 'pro', subscriptionStatus: 'trialing', trialEndsAt: t }, t),
    'free',
  );
  // trial ends 1ms after now -> still active
  assert.equal(
    resolveEffectivePlan(
      { plan: 'pro', subscriptionStatus: 'trialing', trialEndsAt: new Date(t.getTime() + 1) },
      t,
    ),
    'pro',
  );
});
