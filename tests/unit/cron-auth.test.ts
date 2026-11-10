/**
 * Unit tests for src/lib/cron-auth.ts requireCronAuth() — the bearer-token gate
 * on /api/cron/* (sequence-runner, qbo-sync, alerts). These routes write to prod,
 * so the guard must fail closed: refuse when unconfigured, reject wrong/short
 * tokens, and only return null (proceed) on an exact match.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requireCronAuth } from '../../src/lib/cron-auth';

const req = (auth?: string) =>
  ({
    headers: { get: (k: string) => (k.toLowerCase() === 'authorization' ? auth ?? null : null) },
  }) as unknown as Parameters<typeof requireCronAuth>[0];

test('refuses with 503 when CRON_SECRET is unset (fail closed)', () => {
  delete process.env.CRON_SECRET;
  const res = requireCronAuth(req('Bearer anything'));
  assert.ok(res, 'should return a response, not null');
  assert.equal(res!.status, 503);
});

test('authorizes (returns null) with the exact bearer token', () => {
  process.env.CRON_SECRET = 'super-secret-123';
  assert.equal(requireCronAuth(req('Bearer super-secret-123')), null);
});

test('rejects a wrong secret of identical length with 401 (constant-time path)', () => {
  process.env.CRON_SECRET = 'super-secret-123';
  const res = requireCronAuth(req('Bearer super-secret-XYZ'));
  assert.ok(res);
  assert.equal(res!.status, 401);
});

test('rejects a missing header or a token without the Bearer prefix', () => {
  process.env.CRON_SECRET = 'super-secret-123';
  assert.equal(requireCronAuth(req(undefined))!.status, 401);
  assert.equal(requireCronAuth(req('super-secret-123'))!.status, 401);
});
