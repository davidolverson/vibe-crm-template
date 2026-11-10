import { createHmac, timingSafeEqual } from 'node:crypto';
import { neon } from '@neondatabase/serverless';

const TOKEN_BYTES = 15;

function getSecret(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY must be a 32-byte hex string (64 chars) to generate unsubscribe tokens',
    );
  }
  return Buffer.from(hex, 'hex');
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64url(token: string): Buffer {
  const pad = token.length % 4 === 0 ? '' : '='.repeat(4 - (token.length % 4));
  return Buffer.from(token.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

export function generateUnsubscribeToken(email: string): string {
  const key = getSecret();
  const mac = createHmac('sha256', key).update(normalizeEmail(email)).digest();
  return base64url(mac.subarray(0, TOKEN_BYTES));
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  if (!email || !token) return false;
  let expected: Buffer;
  try {
    expected = fromBase64url(generateUnsubscribeToken(email));
  } catch {
    return false;
  }
  let provided: Buffer;
  try {
    provided = fromBase64url(token);
  } catch {
    return false;
  }
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}

export function buildUnsubscribeUrl(email: string, origin: string): string {
  const token = generateUnsubscribeToken(email);
  const url = new URL('/api/unsubscribe', origin);
  url.searchParams.set('email', normalizeEmail(email));
  url.searchParams.set('token', token);
  return url.toString();
}

function sqlClient() {
  const raw = process.env.DATABASE_URL || '';
  if (!raw) throw new Error('DATABASE_URL is not set');
  return neon(raw.replace(/[&?]channel_binding=require/g, ''));
}

let schemaReady = false;

async function ensureUnsubColumn(s: ReturnType<typeof sqlClient>): Promise<void> {
  if (schemaReady) return;
  await s.query(`
    CREATE TABLE IF NOT EXISTS public_submission (
      id         BIGSERIAL PRIMARY KEY,
      kind       TEXT NOT NULL,
      email      TEXT NOT NULL,
      name       TEXT,
      context    TEXT NOT NULL,
      message    TEXT,
      ip         TEXT,
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await s.query(`ALTER TABLE public_submission ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ`);
  await s.query(
    `CREATE INDEX IF NOT EXISTS idx_public_submission_email_lower ON public_submission (lower(email))`,
  );
  schemaReady = true;
}

export async function markEmailUnsubscribed(email: string): Promise<{ affected: number }> {
  const normalized = normalizeEmail(email);
  const s = sqlClient();
  await ensureUnsubColumn(s);
  const rows = (await s.query(
    `UPDATE public_submission
     SET unsubscribed_at = NOW()
     WHERE lower(email) = $1 AND unsubscribed_at IS NULL
     RETURNING id`,
    [normalized],
  )) as unknown[];
  return { affected: rows.length };
}

export async function isEmailUnsubscribed(email: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  const s = sqlClient();
  await ensureUnsubColumn(s);
  const rows = (await s.query(
    `SELECT 1 FROM public_submission
     WHERE lower(email) = $1 AND unsubscribed_at IS NOT NULL
     LIMIT 1`,
    [normalized],
  )) as unknown[];
  return rows.length > 0;
}
