/**
 * Unit tests for src/lib/encryption.ts (AES-256-GCM).
 * This module encrypts at-rest secrets like tenant Twilio/QBO tokens, so the
 * round-trip and — critically — the tamper-detection guarantees are worth pinning.
 * Pure (only node:crypto), so no DATABASE_URL needed here.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encrypt, decrypt } from '../../src/lib/encryption';

const KEY = '0'.repeat(64); // 32-byte hex
process.env.ENCRYPTION_KEY = KEY;

test('round-trips a plaintext secret', () => {
  const secret = 'twilio-auth-token-abc123';
  assert.equal(decrypt(encrypt(secret)), secret);
});

test('round-trips empty, unicode, and long strings', () => {
  for (const s of ['', 'héllo 🌎 dünya', 'x'.repeat(5000)]) {
    assert.equal(decrypt(encrypt(s)), s);
  }
});

test('same plaintext yields different ciphertext each time (random IV)', () => {
  const a = encrypt('secret');
  const b = encrypt('secret');
  assert.notEqual(a, b);
  assert.equal(decrypt(a), 'secret');
  assert.equal(decrypt(b), 'secret');
});

test('a tampered ciphertext fails the GCM auth tag', () => {
  const buf = Buffer.from(encrypt('secret'), 'base64');
  buf[buf.length - 1] ^= 0xff; // flip a ciphertext byte
  assert.throws(() => decrypt(buf.toString('base64')));
});

test('decrypting with a different key fails', () => {
  const enc = encrypt('secret');
  process.env.ENCRYPTION_KEY = 'f'.repeat(64);
  assert.throws(() => decrypt(enc));
  process.env.ENCRYPTION_KEY = KEY;
});

test('rejects a missing or wrong-length key', () => {
  process.env.ENCRYPTION_KEY = 'tooshort';
  assert.throws(() => encrypt('x'), /32-byte hex/);
  delete process.env.ENCRYPTION_KEY;
  assert.throws(() => encrypt('x'), /32-byte hex/);
  process.env.ENCRYPTION_KEY = KEY;
});
