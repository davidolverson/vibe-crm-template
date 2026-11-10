export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const startedAt = Date.now();

export async function GET() {
  const now = Date.now();
  const uptimeMs = now - startedAt;
  const commit = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null;
  const region = process.env.VERCEL_REGION ?? null;

  const url = (process.env.DATABASE_URL || '').replace(/[&?]channel_binding=require/g, '');
  if (!url) {
    return NextResponse.json(
      { status: 'down', db: 'unconfigured', uptimeMs, commit, region, ts: now },
      { status: 503 },
    );
  }

  const dbStart = Date.now();
  try {
    const sql = neon(url);
    await sql`select 1 as ok`;
    const dbMs = Date.now() - dbStart;
    return NextResponse.json(
      { status: 'ok', db: 'ok', dbMs, uptimeMs, commit, region, ts: now },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    const dbMs = Date.now() - dbStart;
    console.error('[health] db probe failed:', err);
    return NextResponse.json(
      { status: 'down', db: 'error', dbMs, uptimeMs, commit, region, ts: now },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
