export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateRequest } from 'twilio';

function xmlResponse(body: string = '<Response/>') {
  return new NextResponse(body, { status: 200, headers: { 'Content-Type': 'text/xml' } });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody));

  const token = process.env.TWILIO_WEBHOOK_AUTH_TOKEN;
  if (!token) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[twilio/voice] TWILIO_WEBHOOK_AUTH_TOKEN missing in production; refusing');
      return NextResponse.json({ error: 'server misconfigured' }, { status: 503 });
    }
    console.warn('[twilio/voice] TWILIO_WEBHOOK_AUTH_TOKEN not set; accepting in non-prod');
  } else {
    const ok = validateRequest(token, req.headers.get('x-twilio-signature') || '', req.url, params);
    if (!ok) return NextResponse.json({ error: 'invalid signature' }, { status: 403 });
  }

  const callSid = params.CallSid;
  const status = params.CallStatus as string;
  const duration = params.CallDuration ? parseInt(params.CallDuration, 10) : null;
  const recordingUrl = params.RecordingUrl || null;

  // Map Twilio CallStatus to our enum
  const mapped: Record<string, string> = {
    initiated: 'initiated',
    ringing: 'ringing',
    'in-progress': 'in_progress',
    completed: 'completed',
    busy: 'busy',
    failed: 'failed',
    'no-answer': 'no_answer',
    canceled: 'cancelled',
  };
  const statusValue = mapped[status] ?? 'completed';

  if (callSid) {
    const existing = await prisma.callLog.findFirst({ where: { twilioSid: callSid } });
    if (existing) {
      await prisma.callLog.update({
        where: { id: existing.id },
        data: {
          status: statusValue as 'initiated' | 'ringing' | 'in_progress' | 'completed' | 'busy' | 'failed' | 'no_answer' | 'cancelled',
          durationSeconds: duration ?? existing.durationSeconds,
          recordingUrl: recordingUrl ?? existing.recordingUrl,
        },
      });
    }
  }

  return xmlResponse();
}
