import { NextResponse } from 'next/server';
export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'disabled' }, { status: 404 });
  }
  return NextResponse.json({
    DATABASE_URL_present: !!process.env.DATABASE_URL,
    DATABASE_URL_len: (process.env.DATABASE_URL ?? '').length,
    DATABASE_URL_head: (process.env.DATABASE_URL ?? '').slice(0, 30),
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? null,
    NODE_ENV: process.env.NODE_ENV,
    env_keys: Object.keys(process.env).filter(k => k.match(/^(DATABASE|BETTER_AUTH|NEXT_PUBLIC|ENCRYPTION)/)),
  });
}
