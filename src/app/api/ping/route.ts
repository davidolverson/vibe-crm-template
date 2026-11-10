import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ ok: true, ts: Date.now() });
}

export async function POST() {
  return NextResponse.json({ ok: true, method: 'POST', ts: Date.now() });
}
