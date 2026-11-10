export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Postmark webhook types -- only fields we care about
interface PostmarkPayload {
  RecordType?: string;
  MessageID?: string;
  Type?: string;
  Email?: string;
  BouncedAt?: string;
  ReceivedAt?: string;
  Metadata?: Record<string, string>;
}

function basicAuthOk(req: NextRequest): boolean {
  const expected = process.env.POSTMARK_WEBHOOK_BASIC_AUTH;
  if (!expected) {
    // Production must configure the shared secret -- refuse otherwise. Without
    // this guard, anyone who knows/guesses a Postmark MessageID can flip a
    // contact's emailOptOut or bounce status.
    if (process.env.NODE_ENV === 'production') {
      console.error('[postmark] POSTMARK_WEBHOOK_BASIC_AUTH missing in production; refusing');
      return false;
    }
    return true;
  }
  const got = req.headers.get('authorization') || '';
  return got === `Basic ${expected}`;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!basicAuthOk(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const payload = (await req.json()) as PostmarkPayload;
  const messageId = payload.MessageID;
  if (!messageId) return NextResponse.json({ ok: true });

  const send = await prisma.emailSend.findFirst({ where: { postmarkMsgId: messageId } });
  if (!send) return NextResponse.json({ ok: true, note: 'no matching EmailSend' });

  const recordType = payload.RecordType || '';
  const now = new Date();
  const patch: Partial<{ status: string; openedAt: Date; clickedAt: Date; bouncedAt: Date; bounceType: string }> = {};

  switch (recordType) {
    case 'Bounce':
      patch.status = payload.Type === 'SpamComplaint' ? 'spam_complaint' : 'bounced';
      patch.bouncedAt = now;
      patch.bounceType = payload.Type || null as unknown as string;
      // Auto-opt out on hard bounces / spam
      if (payload.Type === 'HardBounce' || payload.Type === 'SpamComplaint') {
        await prisma.contact.updateMany({
          where: { id: send.contactId, tenantId: send.tenantId },
          data: { emailOptOut: true },
        }).catch(() => {});
      }
      break;
    case 'Open':
      if (!send.openedAt) {
        patch.openedAt = now;
        patch.status = 'opened';
      }
      break;
    case 'Click':
      patch.clickedAt = now;
      patch.status = 'clicked';
      break;
    case 'SpamComplaint':
      patch.status = 'spam_complaint';
      break;
  }

  if (Object.keys(patch).length) {
    await prisma.emailSend.update({ where: { id: send.id }, data: patch });
  }

  return NextResponse.json({ ok: true });
}
