/**
 * Integration tests for multi-tenant data isolation — the #1 invariant of the
 * whole product ("tenant_id on EVERY query, no exceptions"). Exercises the REAL
 * getTenantDb() $extends middleware against a real Postgres, proving tenant B
 * can never read tenant A's rows via findMany or findUnique.
 *
 * Requires a local Postgres (prisma.ts auto-uses the pg adapter for localhost):
 *   docker run -d --name vibe-test-pg -e POSTGRES_PASSWORD=testpw \
 *     -e POSTGRES_DB=vibetest -p 55432:5432 postgres:16-alpine
 *   npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma \
 *     --script -o /tmp/vibe-schema.sql
 *   docker exec -i vibe-test-pg psql -U postgres -d vibetest < /tmp/vibe-schema.sql
 *
 * Then: npm run test:integration   (sets DATABASE_URL to the local test DB)
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../../src/lib/prisma';
import { withTenantContext } from '../../src/lib/tenant-context';
import { getTenantDb } from '../../src/lib/prisma-tenant';

let tenantAId = '';
let tenantBId = '';
let contactAId = '';

before(async () => {
  // Clean slate (unscoped, direct client). Order respects the FK on contact.tenantId.
  await prisma.contact.deleteMany({});
  await prisma.tenant.deleteMany({});
  const stamp = `${Date.now()}`;
  const a = await prisma.tenant.create({ data: { name: 'Alpha Realty', slug: `alpha-${stamp}` } });
  const b = await prisma.tenant.create({ data: { name: 'Beta Mortgage', slug: `beta-${stamp}` } });
  tenantAId = a.id;
  tenantBId = b.id;
});

test('getTenantDb().create forces the active tenantId, ignoring caller-supplied', async () => {
  // Attacker angle: caller tries to smuggle tenant B's id while acting as tenant A.
  // The middleware must overwrite it with the context tenant (A), not trust the input.
  const c = await withTenantContext(tenantAId, 'user-a', () =>
    getTenantDb().contact.create({ data: { name: 'Alice Client', tenantId: tenantBId } }),
  );
  assert.equal(c.tenantId, tenantAId, 'middleware must override caller-supplied tenantId with the context tenant');
  contactAId = c.id;
});

test('findMany is auto-scoped — tenant B cannot see tenant A rows', async () => {
  const seenByB = await withTenantContext(tenantBId, 'user-b', () =>
    getTenantDb().contact.findMany(),
  );
  assert.equal(seenByB.length, 0, 'tenant B must see zero of tenant A contacts');

  const seenByA = await withTenantContext(tenantAId, 'user-a', () =>
    getTenantDb().contact.findMany(),
  );
  assert.equal(seenByA.length, 1);
  assert.equal(seenByA[0].id, contactAId);
});

test('findUnique blocks cross-tenant fetch-by-id (returns null)', async () => {
  const leaked = await withTenantContext(tenantBId, 'user-b', () =>
    getTenantDb().contact.findUnique({ where: { id: contactAId } }),
  );
  assert.equal(leaked, null, 'tenant B must not fetch tenant A contact by primary key');

  const own = await withTenantContext(tenantAId, 'user-a', () =>
    getTenantDb().contact.findUnique({ where: { id: contactAId } }),
  );
  assert.ok(own && own.id === contactAId, 'tenant A can fetch its own contact');
});

test('getTenantDb throws when no tenant context is set', async () => {
  await assert.rejects(async () => getTenantDb().contact.findMany(), /Tenant context not set/);
});

// --- Mutation isolation: the dangerous direction (cross-tenant writes) ---

async function createInA(name: string): Promise<string> {
  const c = await withTenantContext(tenantAId, 'user-a', () =>
    getTenantDb().contact.create({ data: { name, tenantId: tenantAId } }),
  );
  return c.id;
}

test('update is tenant-scoped — tenant B cannot modify a tenant A row', async () => {
  const id = await createInA('Original Name');
  // B updating A's row by id must fail: the where is scoped to 0 rows -> P2025.
  await assert.rejects(async () =>
    withTenantContext(tenantBId, 'user-b', () =>
      getTenantDb().contact.update({ where: { id }, data: { name: 'Hijacked' } }),
    ),
  );
  const row = await prisma.contact.findUnique({ where: { id } });
  assert.equal(row?.name, 'Original Name', 'tenant A row must be unchanged');
});

test('delete is tenant-scoped — tenant B cannot delete a tenant A row', async () => {
  const id = await createInA('Keep Me');
  // B deleting A's row by id must fail (scoped to 0 rows).
  await assert.rejects(async () =>
    withTenantContext(tenantBId, 'user-b', () => getTenantDb().contact.delete({ where: { id } })),
  );
  const row = await prisma.contact.findUnique({ where: { id } });
  assert.ok(row, 'tenant A row must still exist after B\'s delete attempt');
});

test('deleteMany is tenant-scoped — tenant B "wipe all" leaves tenant A rows intact', async () => {
  const id = await createInA('Survivor');
  const res = await withTenantContext(tenantBId, 'user-b', () =>
    getTenantDb().contact.deleteMany({}),
  );
  assert.equal(res.count, 0, 'tenant B has no rows of its own to delete');
  const row = await prisma.contact.findUnique({ where: { id } });
  assert.ok(row, 'tenant A rows must survive a tenant B deleteMany({})');
});

test('count is tenant-scoped', async () => {
  const aCount = await withTenantContext(tenantAId, 'user-a', () => getTenantDb().contact.count());
  const bCount = await withTenantContext(tenantBId, 'user-b', () => getTenantDb().contact.count());
  assert.ok(aCount >= 1, 'tenant A has its own contacts');
  assert.equal(bCount, 0, 'tenant B counts zero');
});

after(async () => {
  await prisma.contact.deleteMany({});
  await prisma.tenant.deleteMany({});
  await prisma.$disconnect();
});
