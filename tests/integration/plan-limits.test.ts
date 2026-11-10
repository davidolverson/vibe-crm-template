/**
 * Integration tests for src/lib/plan-enforcement.ts limit checks against real
 * Postgres. This is the revenue gate: it counts a tenant's resources and
 * compares them to the effective plan's cap. A bug either lets free tenants
 * exceed limits (lost upsell) or wrongly blocks paying customers. Ties together
 * the real row count + getEffectivePlan (trial/subscription) + limit math.
 *
 * Requires the local test DB — see tenant-isolation.test.ts header for setup.
 * Free plan caps: 100 contacts. Starter: 2500.
 */
import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../src/lib/prisma';
import {
  checkPlanLimit,
  checkPlanLimitSoft,
  enforcePlanLimit,
  PlanLimitError,
} from '../../src/lib/plan-enforcement';

let tenantId = '';
const PAST = new Date('2020-01-01');

before(async () => {
  await prisma.contact.deleteMany({});
  await prisma.tenant.deleteMany({});
});

beforeEach(async () => {
  // Fresh free-plan tenant each test.
  await prisma.contact.deleteMany({});
  await prisma.tenant.deleteMany({});
  tenantId = (
    await prisma.tenant.create({
      data: { name: 'Limit Co', slug: `limit-${Date.now()}-${Math.floor(performance.now())}`, plan: 'free' },
    })
  ).id;
});

async function addContacts(n: number) {
  await prisma.contact.createMany({
    data: Array.from({ length: n }, (_, i) => ({ tenantId, name: `C${i}` })),
  });
}

test('under the free cap: allowed, with correct current/max', async () => {
  await addContacts(3);
  const r = await checkPlanLimit(tenantId, 'contacts');
  assert.equal(r.allowed, true);
  assert.equal(r.current, 3);
  assert.equal(r.max, 100);
});

test('exactly at the free cap (100): blocked', async () => {
  await addContacts(100);
  const r = await checkPlanLimit(tenantId, 'contacts');
  assert.equal(r.current, 100);
  assert.equal(r.max, 100);
  assert.equal(r.allowed, false, '100/100 must not allow another');
  await assert.rejects(() => enforcePlanLimit(tenantId, 'contacts'), PlanLimitError);
});

test('soft check: adding within room returns null, overflow returns a message', async () => {
  await addContacts(3);
  assert.equal(await checkPlanLimitSoft(tenantId, 'contacts', 1), null);
  const msg = await checkPlanLimitSoft(tenantId, 'contacts', 200);
  assert.ok(typeof msg === 'string' && /limit/i.test(msg), 'overflow should return an upgrade message');
});

test('soft-deleted contacts do not count toward the limit', async () => {
  await addContacts(2);
  await prisma.contact.create({ data: { tenantId, name: 'Gone', deletedAt: new Date() } });
  const r = await checkPlanLimit(tenantId, 'contacts');
  assert.equal(r.current, 2, 'deleted contact must be excluded from the count');
});

test('an active starter subscription raises the cap; an expired trial drops it to free', async () => {
  await addContacts(100);

  // Active starter -> cap 2500, so 100 is fine.
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { plan: 'starter', subscriptionStatus: 'active' },
  });
  let r = await checkPlanLimit(tenantId, 'contacts');
  assert.equal(r.max, 2500);
  assert.equal(r.allowed, true);

  // Trial expired -> falls back to free (cap 100), so 100 is blocked.
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { subscriptionStatus: 'trialing', trialEndsAt: PAST },
  });
  r = await checkPlanLimit(tenantId, 'contacts');
  assert.equal(r.max, 100, 'expired trial must enforce free-tier caps');
  assert.equal(r.allowed, false);
});

after(async () => {
  await prisma.contact.deleteMany({});
  await prisma.tenant.deleteMany({});
  await prisma.$disconnect();
});
