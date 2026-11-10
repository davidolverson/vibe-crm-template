export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateRequest } from 'twilio';

function xmlResponse(body: string = '<Response/>') {
  return new NextResponse(body, { status: 200, headers: { 'Content-Type': 'text/xml' } });
}

async function verifySignature(req: NextRequest, rawBody: string): Promise<{ ok: boolean; params: Record<string, string> }> {
  const params = Object.fromEntries(new URLSearchParams(rawBody));
  const signature = req.headers.get('x-twilio-signature') || '';
  const url = req.url;
  const authToken = process.env.TWILIO_WEBHOOK_AUTH_TOKEN;
  if (!authToken) {
    // Production must have the token -- refuse. Local dev (NODE_ENV !== 'production')
    // gets a warn-and-accept for convenience.
    if (process.env.NODE_ENV === 'production') {
      console.error('[twilio/sms] TWILIO_WEBHOOK_AUTH_TOKEN missing in production; refusing');
      return { ok: false, params };
    }
    console.warn('[twilio/sms] TWILIO_WEBHOOK_AUTH_TOKEN not set; accepting in non-prod');
    return { ok: true, params };
  }
  const ok = validateRequest(authToken, signature, url, params);
  return { ok, params };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();
  const { ok, params } = await verifySignature(req, rawBody);
  if (!ok) return NextResponse.json({ error: 'invalid signature' }, { status: 403 });

  const kind = req.nextUrl.searchParams.get('kind');
  const messageSid = params.MessageSid;

  // Status callback branch
  if (kind === 'status' && messageSid) {
    const raw = params.MessageStatus as string;
    // Twilio emits: queued, sending, sent, delivered, undelivered, failed
    // Our enum: queued, sent, delivered, failed, received
    const mapTable: Record<string, 'queued' | 'sent' | 'delivered' | 'failed'> = {
      queued: 'queued',
      sending: 'queued',
      sent: 'sent',
      delivered: 'delivered',
      undelivered: 'failed',
      failed: 'failed',
    };
    const mapped = mapTable[raw] ?? 'queued';
    const existing = await prisma.smsMessage.findFirst({ where: { twilioSid: messageSid } });
    if (existing) {
      await prisma.smsMessage.update({ where: { id: existing.id }, data: { status: mapped } });
    }
    return xmlResponse();
  }

  // Inbound SMS branch
  const from = params.From;
  const to = params.To;
  const body = params.Body || '';

  if (!from || !to) return xmlResponse();

  // Resolve destination phone number to tenant + phoneNumberId
  const phone = await prisma.tenantPhoneNumber.findFirst({ where: { phoneNumber: to } });
  if (!phone) return xmlResponse();

  // Resolve contact by identity or raw number
  const identity = await prisma.contactIdentity.findFirst({
    where: { tenantId: phone.tenantId, type: 'phone', value: from },
  });

  let contactId = identity?.contactId ?? null;
  if (!contactId) {
    const created = await prisma.contact.create({
      data: {
        tenantId: phone.tenantId,
        name: `Unknown ${from}`,
        phone: from,
        source: 'sms_inbound',
      },
    });
    contactId = created.id;
    await prisma.contactIdentity.create({
      data: {
        tenantId: phone.tenantId,
        contactId: created.id,
        type: 'phone',
        value: from,
      },
    }).catch(() => {});
  }

  if (/^\s*(stop|unsubscribe|cancel|end|quit)\s*$/i.test(body)) {
    await prisma.contact.update({ where: { id: contactId }, data: { smsOptOut: true } }).catch(() => {});
  }

  await prisma.smsMessage.create({
    data: {
      tenantId: phone.tenantId,
      contactId,
      phoneNumberId: phone.id,
      direction: 'inbound',
      body,
      status: 'received',
      twilioSid: messageSid ?? null,
    },
  });

  await prisma.activity.create({
    data: {
      tenantId: phone.tenantId,
      contactId,
      type: 'sms',
      body: body.slice(0, 500),
    },
  }).catch(() => {});

  return xmlResponse();
}
