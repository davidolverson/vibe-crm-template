/**
 * Unit tests for the QuickBooks OAuth helpers in src/lib/qbo.ts.
 *
 * Runs on Node's built-in test runner with tsx for TS support — no extra deps:
 *   npm run test:unit
 *
 * Env is set BEFORE importing qbo.ts because:
 *  - src/lib/prisma.ts (transitively imported) throws at module-eval time when
 *    DATABASE_URL is unset, so we hand it a dummy connection string (never used —
 *    the Neon adapter only stores it, it doesn't connect on import).
 *  - the OAuth helpers read ENCRYPTION_KEY / the base-URL vars at call time, so
 *    individual tests can still tweak process.env per case.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
// DATABASE_URL must exist before this import — prisma.ts (pulled in transitively)
// throws at module-eval time without it. The test:unit npm script sets a dummy
// value via cross-env; the Neon adapter only stores it, it never connects here.
import { getQboAuthUrl, verifyOAuthState } from '../../src/lib/qbo';

const CALLBACK_PATH = '/api/auth/quickbooks/callback';

// Read at call time by the OAuth helpers, so setting them during file evaluation
// (before any test callback runs) is sufficient.
process.env.ENCRYPTION_KEY = 'a'.repeat(64); // 32-byte hex, satisfies encryption.ts
process.env.QBO_CLIENT_ID = 'test-client-id';
process.env.QBO_CLIENT_SECRET = 'test-client-secret';

function redirectUriFrom(authUrl: string): string {
  return new URL(authUrl).searchParams.get('redirect_uri') ?? '';
}
function stateFrom(authUrl: string): string {
  return new URL(authUrl).searchParams.get('state') ?? '';
}

test('redirect URI is derived from NEXT_PUBLIC_APP_URL when QBO_REDIRECT_URI is unset', () => {
  delete process.env.QBO_REDIRECT_URI;
  delete process.env.BETTER_AUTH_URL;
  delete process.env.APP_URL;
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';

  const url = getQboAuthUrl('tenant-123');
  assert.equal(redirectUriFrom(url), `https://app.example.com${CALLBACK_PATH}`);
});

test('derived redirect URI strips a trailing slash on the base URL', () => {
  delete process.env.QBO_REDIRECT_URI;
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com/';

  const url = getQboAuthUrl('tenant-123');
  assert.equal(redirectUriFrom(url), `https://app.example.com${CALLBACK_PATH}`);
});

test('an explicit QBO_REDIRECT_URI always wins over the derived value', () => {
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
  process.env.QBO_REDIRECT_URI = 'https://explicit.example.com/custom/callback';

  const url = getQboAuthUrl('tenant-123');
  assert.equal(redirectUriFrom(url), 'https://explicit.example.com/custom/callback');
});

test('falls back to BETTER_AUTH_URL when NEXT_PUBLIC_APP_URL is unset', () => {
  delete process.env.QBO_REDIRECT_URI;
  delete process.env.NEXT_PUBLIC_APP_URL;
  process.env.BETTER_AUTH_URL = 'https://auth.example.com';

  const url = getQboAuthUrl('tenant-123');
  assert.equal(redirectUriFrom(url), `https://auth.example.com${CALLBACK_PATH}`);
});

test('throws when neither an explicit URI nor any base URL is available', () => {
  delete process.env.QBO_REDIRECT_URI;
  delete process.env.NEXT_PUBLIC_APP_URL;
  delete process.env.BETTER_AUTH_URL;
  delete process.env.APP_URL;

  assert.throws(() => getQboAuthUrl('tenant-123'), /not configured/);
});

test('the OAuth state round-trips the tenantId and verifies', () => {
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
  delete process.env.QBO_REDIRECT_URI;

  const url = getQboAuthUrl('tenant-abc-999');
  const state = stateFrom(url);
  assert.equal(verifyOAuthState(state), 'tenant-abc-999');
});

test('verifyOAuthState rejects a tampered state (wrong tenantId, stale signature)', () => {
  process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
  const url = getQboAuthUrl('tenant-real');
  const [nonce, , sig] = stateFrom(url).split(':');

  // Swap the tenantId but keep the original signature -> must fail HMAC check.
  const forged = `${nonce}:tenant-attacker:${sig}`;
  assert.equal(verifyOAuthState(forged), null);
});

test('verifyOAuthState rejects malformed states', () => {
  assert.equal(verifyOAuthState('not-a-valid-state'), null);
  assert.equal(verifyOAuthState('only:two'), null);
});
