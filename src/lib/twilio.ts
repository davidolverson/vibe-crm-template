import { Twilio } from 'twilio';
import { prisma } from './prisma';
import { decrypt } from './encryption';

/**
 * Create an authenticated Twilio client for a tenant.
 * Decrypts stored credentials on the fly.
 */
export async function getTwilioClient(tenantId: string): Promise<Twilio> {
  const config = await prisma.tenantTwilioConfig.findUnique({
    where: { tenantId },
  });

  if (!config) {
    throw new Error('Twilio not configured for this tenant');
  }

  const accountSid = decrypt(config.accountSid);
  const authToken = decrypt(config.authToken);

  return new Twilio(accountSid, authToken);
}

/**
 * Get the default phone number for a tenant.
 */
export async function getDefaultPhoneNumber(tenantId: string) {
  const phone = await prisma.tenantPhoneNumber.findFirst({
    where: { tenantId, isDefault: true },
  });

  if (!phone) {
    throw new Error('No default phone number configured');
  }

  return phone;
}

/**
 * Validate Twilio credentials by making a test API call.
 */
export async function validateTwilioCredentials(
  accountSid: string,
  authToken: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const client = new Twilio(accountSid, authToken);
    await client.api.accounts(accountSid).fetch();
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid Twilio credentials' };
  }
}

/**
 * Send an outbound SMS for a tenant. Logs to SmsMessage + activity.
 * Belt-and-suspenders: opt-out is checked here so future callers (sequence
 * runner SMS steps, automations) cannot forget.
 */
export async function sendSms(params: {
  tenantId: string;
  contactId: string;
  toNumber: string;
  body: string;
  userId?: string;
}): Promise<{ messageSid: string; smsMessageId: string }> {
  const contact = await prisma.contact.findFirst({
    where: { id: params.contactId, tenantId: params.tenantId },
    select: { smsOptOut: true },
  });
  if (!contact) throw new Error('Contact not found in this tenant');
  if (contact.smsOptOut) throw new Error('Contact has opted out of SMS');

  const client = await getTwilioClient(params.tenantId);
  const fromPhone = await getDefaultPhoneNumber(params.tenantId);

  const msg = await client.messages.create({
    from: fromPhone.phoneNumber,
    to: params.toNumber,
    body: params.body,
    statusCallback: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/webhooks/twilio/sms?kind=status`,
  });

  const row = await prisma.smsMessage.create({
    data: {
      tenantId: params.tenantId,
      contactId: params.contactId,
      phoneNumberId: fromPhone.id,
      direction: 'outbound',
      body: params.body,
      status: 'queued',
      twilioSid: msg.sid,
      userId: params.userId ?? null,
    },
  });

  await prisma.activity.create({
    data: {
      tenantId: params.tenantId,
      contactId: params.contactId,
      type: 'sms',
      body: params.body.slice(0, 500),
      userId: params.userId ?? null,
    },
  }).catch(() => {});

  return { messageSid: msg.sid, smsMessageId: row.id };
}

/**
 * Issue a short-lived Voice SDK access token for browser-based click-to-call.
 */
export async function issueVoiceAccessToken(tenantId: string, identity: string): Promise<string> {
  const { jwt } = await import('twilio');
  const AccessToken = jwt.AccessToken;
  const VoiceGrant = AccessToken.VoiceGrant;

  const cfg = await prisma.tenantTwilioConfig.findUnique({ where: { tenantId } });
  if (!cfg) throw new Error('Twilio not configured');
  if (!cfg.twimlAppSid) throw new Error('TwiML App SID not set -- create it in Twilio console');

  const sidKey = process.env.TWILIO_API_KEY_SID;
  const secretKey = process.env.TWILIO_API_KEY_SECRET;
  const accountSid = decrypt(cfg.accountSid);
  if (!sidKey || !secretKey) throw new Error('TWILIO_API_KEY_SID/SECRET not set');

  const token = new AccessToken(accountSid, sidKey, secretKey, { identity, ttl: 3600 });
  token.addGrant(new VoiceGrant({ outgoingApplicationSid: cfg.twimlAppSid, incomingAllow: true }));
  return token.toJwt();
}
