import { NextRequest, NextResponse } from 'next/server';

/**
 * Auth guard for /api/cron/* routes.
 *
 * Vercel's cron runner sends `Authorization: Bearer <CRON_SECRET>` where
 * CRON_SECRET is the value you configured in the Vercel project env. If the
 * header is missing or mismatched, this returns a 401 and you should return
 * that response directly from the handler.
 *
 * Returns `null` when the request is authorized -- the handler should proceed.
 *
 * If CRON_SECRET is unset, we refuse all requests rather than accepting
 * blindly, because a cron route that runs for anyone is a prod-writes-from-
 * the-internet problem.
 */
export function requireCronAuth(req: NextRequest): NextResponse | null {
  const configured = process.env.CRON_SECRET;
  if (!configured) {
    console.error('[cron-auth] CRON_SECRET is not set -- refusing cron request');
    return NextResponse.json(
      { ok: false, error: 'cron not configured' },
      { status: 503 },
    );
  }

  const header = req.headers.get('authorization') || '';
  const expected = `Bearer ${configured}`;

  if (header.length !== expected.length) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  // Constant-time compare to avoid timing oracle on the secret.
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= header.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  if (diff !== 0) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  return null;
}
