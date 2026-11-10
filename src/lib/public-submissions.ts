import { neon } from '@neondatabase/serverless';

/**
 * Lossless storage for the public marketing forms (waitlist + contact).
 *
 * Self-bootstraps its table via CREATE TABLE IF NOT EXISTS on every call so
 * this file stays zero-migration. We deliberately avoid the Prisma layer
 * here -- the marketing forms need to work even in a broken-Prisma state,
 * and we don't want a tenant-id injection middleware near this data.
 *
 * Every submission is also emailed via the public-email helper; this is the
 * belt-and-suspenders: we never drop a signup just because Postmark is
 * unconfigured or the email inbox is down.
 */

function sql() {
  const raw = process.env.DATABASE_URL || '';
  if (!raw) throw new Error('DATABASE_URL is not set');
  return neon(raw.replace(/[&?]channel_binding=require/g, ''));
}

export type PublicSubmissionKind = 'waitlist' | 'contact';

export type RecordSubmissionParams = {
  kind: PublicSubmissionKind;
  email: string;
  name?: string | null;
  /** e.g. 'hero' / 'founding' / 'final' for waitlist; 'founding' / 'pricing' / 'product' / 'press' / 'general' for contact */
  context: string;
  /** Body of the contact-form message, if any. Waitlist rows leave this empty. */
  message?: string | null;
  ip?: string | null;
  userAgent?: string | null;
};

let schemaReady = false;

async function ensureSchema(s: ReturnType<typeof sql>): Promise<void> {
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
  await s.query(
    `CREATE INDEX IF NOT EXISTS idx_public_submission_created_at ON public_submission (created_at DESC)`,
  );
  await s.query(
    `CREATE INDEX IF NOT EXISTS idx_public_submission_kind ON public_submission (kind, created_at DESC)`,
  );
  schemaReady = true;
}

/**
 * Insert one submission row. Best-effort -- we log and swallow errors so a DB
 * blip never turns into a user-visible 500 on the marketing surface.
 */
export async function recordSubmission(
  params: RecordSubmissionParams,
): Promise<void> {
  try {
    const s = sql();
    await ensureSchema(s);
    await s.query(
      `INSERT INTO public_submission (kind, email, name, context, message, ip, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        params.kind,
        params.email,
        params.name ?? null,
        params.context,
        params.message ?? null,
        params.ip ?? null,
        params.userAgent ?? null,
      ],
    );
  } catch (err) {
    console.error('[public-submissions] insert failed:', err);
  }
}

export type RecentSubmission = {
  id: string;
  kind: PublicSubmissionKind;
  email: string;
  name: string | null;
  context: string;
  message: string | null;
  createdAt: string;
};

export async function getRecentSubmissions(
  limit = 50,
): Promise<RecentSubmission[]> {
  const safeLimit = Math.max(1, Math.min(200, Number(limit) || 50));
  try {
    const s = sql();
    await ensureSchema(s);
    const rows = (await s.query(
      `SELECT id::text AS id,
              kind,
              email,
              name,
              context,
              message,
              to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "createdAt"
       FROM public_submission
       ORDER BY created_at DESC
       LIMIT $1`,
      [safeLimit],
    )) as Array<RecentSubmission>;
    return rows;
  } catch (err) {
    console.error('[public-submissions] fetch failed:', err);
    return [];
  }
}
