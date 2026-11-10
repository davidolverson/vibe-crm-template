import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth-server';

/**
 * The environment variable name that holds the comma-separated list of
 * platform super-admin email addresses. Exported so UI can show a helpful
 * setup hint when it is unset.
 */
export const ADMIN_EMAILS_ENV_KEY = 'ADMIN_EMAILS';

/**
 * Returns true if `email` is listed in `process.env.ADMIN_EMAILS`
 * (comma-separated, case-insensitive, trimmed). Returns false if the env
 * variable is unset/empty or `email` is null/undefined/empty.
 *
 * This is NOT a tenant-scoped role -- it grants access to cross-tenant
 * platform-admin surfaces.
 */
export function isPlatformAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const raw = process.env[ADMIN_EMAILS_ENV_KEY];
  if (!raw) return false;

  const needle = email.trim().toLowerCase();
  if (!needle) return false;

  const allowed = raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return allowed.includes(needle);
}

/**
 * Guard for platform-admin server components / route handlers.
 *
 * Resolves the current Better Auth session. If there is no session, or the
 * session user's email is not in the `ADMIN_EMAILS` allowlist, this calls
 * Next.js `notFound()` -- returning a 404 rather than a redirect, so the
 * admin surface stays unadvertised to unauthorized visitors.
 *
 * Returns `{ userId, email }` on success.
 */
export async function requirePlatformAdmin(): Promise<{ userId: string; email: string }> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const user = session?.user;
  const email = user?.email;

  if (!user || !email || !isPlatformAdminEmail(email)) {
    notFound();
  }

  return { userId: user.id, email };
}
