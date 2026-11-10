import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'disabled' }, { status: 404 });
  }
  try {
    const url = (process.env.DATABASE_URL || '').replace(/[&?]channel_binding=require/g, '');
    const sql = neon(url);
    const rows = await sql`select now() as now`;
    return NextResponse.json({ ok: true, rows });
  } catch (e) {
    const err = e as Error;
    return NextResponse.json({ ok: false, error: err.message, name: err.name });
  }
}
