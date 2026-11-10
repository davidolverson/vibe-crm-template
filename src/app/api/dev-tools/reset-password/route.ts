export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'disabled' }, { status: 404 });
  }
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'email and password required' }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ error: 'user not found' }, { status: 404 });
  const ctx = await auth.$context;
  const hash = await ctx.password.hash(password);
  const r = await prisma.account.updateMany({
    where: { userId: user.id, providerId: 'credential' },
    data: { password: hash },
  });
  return NextResponse.json({ ok: true, rows: r.count });
}
