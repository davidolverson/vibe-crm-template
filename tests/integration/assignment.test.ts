/**
 * Integration tests for src/lib/assignment.ts assignContact() against real
 * Postgres. This decides who owns each new lead. The round-robin path mutates
 * lastAssignedIndex, so correctness = the right owner AND a correctly advanced
 * (and wrapping) index; a bug here silently funnels every lead to one rep or
 * drops assignment entirely.
 *
 * Requires the local test DB — see tenant-isolation.test.ts header for setup.
 */
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../src/lib/prisma';
import { assignContact } from '../../src/lib/assignment';

let tenantId = '';

before(async () => {
  await prisma.assignmentRule.deleteMany({});
  await prisma.tenant.deleteMany({});
  tenantId = (await prisma.tenant.create({ data: { name: 'Assign Co', slug: `assign-${Date.now()}` } })).id;
});

beforeEach(async () => {
  await prisma.assignmentRule.deleteMany({ where: { tenantId } });
});

test('no rules -> no assignment (null)', async () => {
  assert.equal(await assignContact(tenantId), null);
});

test('default_owner rule returns its configured user', async () => {
  await prisma.assignmentRule.create({
    data: { tenantId, type: 'default_owner', configJson: { active: true, userId: 'owner-1' } },
  });
  assert.equal(await assignContact(tenantId), 'owner-1');
});

test('round_robin advances the index and wraps around', async () => {
  await prisma.assignmentRule.create({
    data: {
      tenantId,
      type: 'round_robin',
      configJson: { active: true, userIds: ['u1', 'u2', 'u3'] },
      lastAssignedIndex: 0,
    },
  });
  // starts at index 0 -> next is (0+1)%3 = u2, then u3, then wraps to u1
  assert.equal(await assignContact(tenantId), 'u2');
  assert.equal(await assignContact(tenantId), 'u3');
  assert.equal(await assignContact(tenantId), 'u1');
  assert.equal(await assignContact(tenantId), 'u2');
});

test('round_robin takes priority over default_owner', async () => {
  await prisma.assignmentRule.create({
    data: { tenantId, type: 'default_owner', configJson: { active: true, userId: 'owner-1' } },
  });
  await prisma.assignmentRule.create({
    data: {
      tenantId,
      type: 'round_robin',
      configJson: { active: true, userIds: ['rr-1'] },
      lastAssignedIndex: 0,
    },
  });
  assert.equal(await assignContact(tenantId), 'rr-1');
});

test('an inactive round_robin falls back to default_owner', async () => {
  await prisma.assignmentRule.create({
    data: { tenantId, type: 'default_owner', configJson: { active: true, userId: 'owner-1' } },
  });
  await prisma.assignmentRule.create({
    data: {
      tenantId,
      type: 'round_robin',
      configJson: { active: false, userIds: ['rr-1'] },
      lastAssignedIndex: 0,
    },
  });
  assert.equal(await assignContact(tenantId), 'owner-1');
});

after(async () => {
  await prisma.assignmentRule.deleteMany({});
  await prisma.tenant.deleteMany({});
  await prisma.$disconnect();
});
