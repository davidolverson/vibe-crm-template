/**
 * Unit tests for the pure token helpers in src/lib/unsubscribe.ts.
 * These sign/verify one-click email-unsubscribe links (HMAC-SHA256, timing-safe),
 * so a regression could either break legitimate unsubscribes or let a forged
 * token unsubscribe someone else. The DB helpers (markEmailUnsubscribed etc.)
 * need a live Postgres and are covered by e2e, not here.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateUnsubscribeToken,
  verifyUnsubscribeToken,
  buildUnsubscribeUrl,
} from '../../src/lib/unsubscribe';

process.env.ENCRYPTION_KEY = 'b'.repeat(64);

test('token generation is deterministic for the same email', () => {
  assert.equal(generateUnsubscribeToken('lead@example.com'), generateUnsubscribeToken('lead@example.com'));
});

test('email is normalized (case + surrounding whitespace) before signing', () => {
  const canonical = generateUnsubscribeToken('lead@example.com');
  assert.equal(generateUnsubscribeToken('  LEAD@Example.COM '), canonical);
  // and a token minted from the messy form still verifies against the clean one
  assert.ok(verifyUnsubscribeToken('lead@example.com', generateUnsubscribeToken(' Lead@Example.com ')));
});

test('a valid token verifies; a wrong/garbage token does not', () => {
  const token = generateUnsubscribeToken('lead@example.com');
  assert.ok(verifyUnsubscribeToken('lead@example.com', token));
  assert.equal(verifyUnsubscribeToken('lead@example.com', 'not-the-token'), false);
  assert.equal(verifyUnsubscribeToken('lead@example.com', ''), false);
  assert.equal(verifyUnsubscribeToken('', token), false);
});

test("one email's token cannot unsubscribe a different email", () => {
  const token = generateUnsubscribeToken('victim@example.com');
  assert.equal(verifyUnsubscribeToken('attacker@example.com', token), false);
});

test('different emails produce different tokens', () => {
  assert.notEqual(generateUnsubscribeToken('a@example.com'), generateUnsubscribeToken('b@example.com'));
});

test('buildUnsubscribeUrl embeds a normalized email + a self-verifying token', () => {
  const url = new URL(buildUnsubscribeUrl('  Lead@Example.com ', 'https://app.example.com'));
  assert.equal(url.pathname, '/api/unsubscribe');
  assert.equal(url.searchParams.get('email'), 'lead@example.com');
  const token = url.searchParams.get('token') ?? '';
  assert.ok(verifyUnsubscribeToken('lead@example.com', token));
});
