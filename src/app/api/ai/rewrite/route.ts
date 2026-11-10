export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthContext, AuthError } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { rewriteDraft } from '@/lib/ai/service';

const bodySchema = z.object({
  draft: z.string().min(1).max(16_000),
  mode: z.enum(['sms', 'email']),
  tone: z.enum(['friendlier', 'shorter', 'more_professional', 'more_urgent', 'fix_grammar']),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  let ctx;
  try {
    ctx = await getAuthContext();
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    }
    throw err;
  }

  let parsed;
  try {
    const raw = await req.json();
    parsed = bodySchema.safeParse(raw);
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    );
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: { name: true },
  });

  const result = await rewriteDraft({
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    input: {
      tenantName: tenant?.name ?? 'our team',
      mode: parsed.data.mode,
      tone: parsed.data.tone,
      draft: parsed.data.draft,
    },
  });

  if (!result.success) return NextResponse.json(result, { status: statusForCode(result.code) });
  return NextResponse.json(result, { status: 200 });
}

function statusForCode(code: string): number {
  switch (code) {
    case 'quota_exceeded':
      return 402;
    case 'rate_limited':
    case 'upstream_overloaded':
      return 429;
    case 'feature_disabled':
    case 'kill_switch':
    case 'not_configured':
      return 503;
    case 'invalid_input':
      return 400;
    default:
      return 500;
  }
}
