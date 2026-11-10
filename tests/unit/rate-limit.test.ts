/**
 * Unit tests for src/lib/rate-limit.ts — the in-memory limiter guarding public
 * endpoints (waitlist, contact, founding checkout, site tracking). A regression
 * here either lets abuse through or locks out legitimate traffic.
 * Each test uses a unique key since the limiter's store is module-global.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rateLimit } from '../../src/lib/rate-limit';

test('first request in a fresh window succeeds with remaining = limit-1', () => {
  const r = rateLimit('rl:first', 5, 60_000);
  assert.equal(r.success, true);
  assert.equal(r.remaining, 4);
});

test('allows exactly `limit` requests, then blocks', () => {
  const key = 'rl:exact';
  const results = Array.from({ length: 5 }, () => rateLimit(key, 3, 60_000));
  assert.deepEqual(results.map((r) => r.success), [true, true, true, false, false]);
  assert.equal(results[2].remaining, 0);
  assert.equal(results[3].remaining, 0);
});

test('separate keys are tracked independently', () => {
  rateLimit('rl:a', 1, 60_000); // consume key a
  const a = rateLimit('rl:a', 1, 60_000);
  const b = rateLimit('rl:b', 1, 60_000);
  assert.equal(a.success, false);
  assert.equal(b.success, true);
});

test('the window resets after it expires', async () => {
  const key = 'rl:reset';
  assert.equal(rateLimit(key, 1, 30).success, true);
  assert.equal(rateLimit(key, 1, 30).success, false); // blocked within window
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(rateLimit(key, 1, 30).success, true); // fresh window
});
