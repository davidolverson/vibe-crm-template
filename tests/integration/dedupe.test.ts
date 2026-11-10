/**
 * Integration tests for src/lib/dedupe.ts findDuplicateContact() against real
 * Postgres. Dedupe is what stops the same lead being created twice; a regression
 * either lets duplicates through or (worse) matches across tenants. Verifies
 * email-priority, phone fallback, soft-delete exclusion, and tenant scoping.
 *
 * Requires the local test DB — see tenant-isolation.test.ts header for setup.
 * Run serialized: `npm run test:integration` uses --test-concurrency=1 so this
 * file and tenant-isolation.test.ts don't clobber each other's rows.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../src/lib/prisma';
import { withTenantContext } from '../../src/lib/tenant-context';
import { getTenantDb } from '../../src/lib/prisma-tenant';
import { findDuplicateContact } from '../../src/lib/dedupe';

let tenantAId = '';
let tenantBId = '';

before(async () => {
  await prisma.contact.deleteMany({});
  await prisma.tenant.deleteMany({});
  const stamp = `${Date.now()}`;
  tenantAId = (await prisma.tenant.create({ data: { name: 'A', slug: `dedupe-a-${stamp}` } })).id;
  tenantBId = (await prisma.tenant.create({ data: { name: 'B', slug: `dedupe-b-${stamp}` } })).id;
  await prisma.contact.create({
    data: { tenantId: tenantAId, name: 'Existing Lead', email: 'dup@example.com', phone: '+15551230000' },
  });
});

// Helper: run fn inside tenant A's context with a fresh scoped client.
function inA<T>(fn: (db: ReturnType<typeof getTenantDb>) => Promise<T>): Promise<T> {
  return withTenantContext(tenantAId, 'user-a', () => fn(getTenantDb())) as Promise<T>;
}

test('matches an existing contact by email', async () => {
  const r = await inA((db) => findDuplicateContact(db, 'dup@example.com', null));
  assert.ok(r);
  assert.equal(r!.matchedOn, 'email');
  assert.equal(r!.email, 'dup@example.com');
});

test('falls back to a phone match when email is absent', async () => {
  const r = await inA((db) => findDuplicateContact(db, null, '+15551230000'));
  assert.ok(r);
  assert.equal(r!.matchedOn, 'phone');
});

test('email takes priority over phone', async () => {
  // Email matches the existing lead; the phone belongs to no one -> email wins.
  const r = await inA((db) => findDuplicateContact(db, 'dup@example.com', '+19999999999'));
  assert.equal(r!.matchedOn, 'email');
});

test('returns null when neither email nor phone matches', async () => {
  const r = await inA((db) => findDuplicateContact(db, 'nobody@example.com', '+10000000000'));
  assert.equal(r, null);
});

test('ignores soft-deleted contacts', async () => {
  await prisma.contact.create({
    data: { tenantId: tenantAId, name: 'Deleted', email: 'gone@example.com', deletedAt: new Date() },
  });
  const r = await inA((db) => findDuplicateContact(db, 'gone@example.com', null));
  assert.equal(r, null, 'a soft-deleted contact must not count as a duplicate');
});

test('dedupe is tenant-scoped — tenant B never matches tenant A rows', async () => {
  const r = await withTenantContext(tenantBId, 'user-b', () =>
    findDuplicateContact(getTenantDb(), 'dup@example.com', '+15551230000'),
  );
  assert.equal(r, null, 'tenant B must not match tenant A email or phone');
});

after(async () => {
  await prisma.contact.deleteMany({});
  await prisma.tenant.deleteMany({});
  await prisma.$disconnect();
});
