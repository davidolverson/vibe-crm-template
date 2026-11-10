/**
 * Unit tests for src/lib/plans.ts — the billing plan catalog + limit lookups.
 * Guards against a mistyped plan id silently granting the wrong quota, and keeps
 * the tiers internally consistent (order matches catalog, limits/prices ascend).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLANS, PLAN_ORDER, getPlan, getPlanLimits, TRIAL_DAYS } from '../../src/lib/plans';

test('getPlan falls back to free for unknown or empty ids', () => {
  assert.equal(getPlan('nonsense').id, 'free');
  assert.equal(getPlan('').id, 'free');
});

test('getPlan returns the matching plan for every known id', () => {
  for (const id of PLAN_ORDER) {
    assert.equal(getPlan(id).id, id);
  }
});

test('getPlanLimits delegates to the resolved plan', () => {
  assert.deepEqual(getPlanLimits('pro'), PLANS.pro.limits);
  assert.deepEqual(getPlanLimits('unknown'), PLANS.free.limits);
});

test('PLAN_ORDER covers exactly the defined plans', () => {
  assert.deepEqual([...PLAN_ORDER].sort(), Object.keys(PLANS).sort());
});

test('price and core limits ascend monotonically up the tiers', () => {
  for (let i = 1; i < PLAN_ORDER.length; i++) {
    const lo = PLANS[PLAN_ORDER[i - 1]];
    const hi = PLANS[PLAN_ORDER[i]];
    assert.ok(hi.priceMonthly >= lo.priceMonthly, `${hi.id} price >= ${lo.id}`);
    assert.ok(hi.limits.maxUsers >= lo.limits.maxUsers, `${hi.id} maxUsers >= ${lo.id}`);
    assert.ok(hi.limits.maxContacts >= lo.limits.maxContacts, `${hi.id} maxContacts >= ${lo.id}`);
  }
});

test('free plan has no stripe price and TRIAL_DAYS is 14', () => {
  assert.equal(PLANS.free.stripePriceId, undefined);
  assert.equal(PLANS.free.priceMonthly, 0);
  assert.equal(TRIAL_DAYS, 14);
});
