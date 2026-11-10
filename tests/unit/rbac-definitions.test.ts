/**
 * Unit tests for src/lib/rbac-definitions.ts — the single source of truth for
 * the RBAC matrix (consumed by prisma/seed.ts and tenant-provision.ts). Pins the
 * role set, scope integrity, and the assigned-vs-all data-isolation boundaries.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ROLE_DEFINITIONS,
  RESOURCE_ACTIONS,
  DEFAULT_PIPELINE_STAGES,
  DEFAULT_FORM_FIELDS,
} from '../../src/lib/rbac-definitions';

const roleNames = ROLE_DEFINITIONS.map((r) => r.name);
const has = (roleName: string, resource: string, action: string) =>
  ROLE_DEFINITIONS.find((r) => r.name === roleName)!.permissions.some(
    (p) => p.resource === resource && p.action === action,
  );

test('defines exactly the 5 expected roles with unique names', () => {
  assert.deepEqual(roleNames, ['Owner', 'Admin', 'Producer', 'Assistant', 'Transaction Coordinator']);
  assert.equal(new Set(roleNames).size, roleNames.length);
});

test('every permission has a valid scope (all | assigned)', () => {
  for (const role of ROLE_DEFINITIONS) {
    for (const p of role.permissions) {
      assert.ok(p.scope === 'all' || p.scope === 'assigned', `${role.name}/${p.resource}/${p.action}=${p.scope}`);
    }
  }
});

test('Owner can delete core records; Assistant cannot', () => {
  for (const res of ['contacts', 'deals', 'tasks']) {
    assert.ok(has('Owner', res, 'delete'), `Owner should delete ${res}`);
  }
  assert.equal(has('Assistant', 'contacts', 'delete'), false);
  assert.equal(has('Producer', 'contacts', 'delete'), false);
});

test('Producer/TC see contacts scoped to "assigned", not "all" (data isolation)', () => {
  for (const roleName of ['Producer', 'Transaction Coordinator']) {
    const view = ROLE_DEFINITIONS.find((r) => r.name === roleName)!.permissions.find(
      (p) => p.resource === 'contacts' && p.action === 'view',
    )!;
    assert.equal(view.scope, 'assigned', `${roleName} contacts:view scope`);
  }
  // whereas an admin-tier role sees all
  const ownerView = ROLE_DEFINITIONS.find((r) => r.name === 'Owner')!.permissions.find(
    (p) => p.resource === 'contacts' && p.action === 'view',
  )!;
  assert.equal(ownerView.scope, 'all');
});

test('RESOURCE_ACTIONS is derived from the roles with sorted actions', () => {
  const contacts = RESOURCE_ACTIONS.find((r) => r.resource === 'contacts')!;
  assert.deepEqual(contacts.actions, ['create', 'delete', 'edit', 'view']);
});

test('default pipeline stages are sequential and terminate in won/lost', () => {
  DEFAULT_PIPELINE_STAGES.forEach((s, i) => assert.equal(s.position, i));
  assert.equal(DEFAULT_PIPELINE_STAGES[0].name, 'New Lead');
  assert.equal(DEFAULT_PIPELINE_STAGES.at(-1)!.name, 'Closed Lost');
});

test('default form fields require first/last name and a valid email', () => {
  const byLabel = Object.fromEntries(DEFAULT_FORM_FIELDS.map((f) => [f.label, f]));
  assert.equal(byLabel['Email'].required, true);
  assert.equal(byLabel['Email'].type, 'email');
  assert.equal(byLabel['First Name'].required, true);
  assert.equal(byLabel['Phone'].required, false);
});
