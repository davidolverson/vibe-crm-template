export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireCronAuth } from '@/lib/cron-auth';

// Scheduled daily at 08:00 UTC via vercel.json. Flushes scheduled social posts
// whose publish time has arrived. Stub for now so Vercel crons stop 404ing.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const unauthorized = requireCronAuth(req);
  if (unauthorized) return unauthorized;

  const startedAt = Date.now();
  console.log('[cron:social-publisher] invoked -- not yet implemented');
  return NextResponse.json({
    ok: true,
    job: 'social-publisher',
    status: 'stub',
    published: 0,
    durationMs: Date.now() - startedAt,
    ts: startedAt,
  });
}
