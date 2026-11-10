/**
 * Unit tests for src/lib/csrf.ts validateOrigin() — the Origin/Referer check
 * that blocks cross-site POSTs to mutation endpoints. Pins the allow/deny matrix
 * so a refactor can't silently disable CSRF protection.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateOrigin } from '../../src/lib/csrf';

// Minimal NextRequest stand-in: only .headers.get() is used.
const req = (h: Record<string, string>) =>
  ({ headers: { get: (k: string) => h[k.toLowerCase()] ?? null } }) as unknown as Parameters<
    typeof validateOrigin
  >[0];

const APP = 'https://app.example.com';

test('skips the check when NEXT_PUBLIC_APP_URL is unset (dev safety net)', () => {
  delete process.env.NEXT_PUBLIC_APP_URL;
  assert.equal(validateOrigin(req({ origin: 'https://evil.com' })), true);
});

test('a matching Origin passes', () => {
  process.env.NEXT_PUBLIC_APP_URL = APP;
  assert.equal(validateOrigin(req({ origin: APP })), true);
});

test('a mismatched Origin is rejected', () => {
  process.env.NEXT_PUBLIC_APP_URL = APP;
  assert.equal(validateOrigin(req({ origin: 'https://evil.com' })), false);
});

test('falls back to Referer when Origin is absent', () => {
  process.env.NEXT_PUBLIC_APP_URL = APP;
  assert.equal(validateOrigin(req({ referer: 'https://app.example.com/dashboard' })), true);
  assert.equal(validateOrigin(req({ referer: 'https://evil.com/x' })), false);
});

test('no Origin and no Referer is allowed (same-origin / server-side)', () => {
  process.env.NEXT_PUBLIC_APP_URL = APP;
  assert.equal(validateOrigin(req({})), true);
});

test('a malformed Referer is rejected', () => {
  process.env.NEXT_PUBLIC_APP_URL = APP;
  assert.equal(validateOrigin(req({ referer: 'not a url' })), false);
});
