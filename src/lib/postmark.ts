import { ServerClient, Models } from 'postmark';

/**
 * Get a Postmark client.
 * Uses the global POSTMARK_SERVER_TOKEN env var.
 * Future: per-tenant Postmark tokens.
 */
export function getPostmarkClient(): ServerClient {
  const token = process.env.POSTMARK_SERVER_TOKEN;

  if (!token) {
    throw new Error('Postmark not configured -- set POSTMARK_SERVER_TOKEN');
  }

  return new ServerClient(token);
}

/**
 * Get the default "from" email for a tenant.
 */
export function getFromEmail(_tenantId: string): string {
  // Future: per-tenant from address from DB
  return (
    process.env.POSTMARK_FROM_EMAIL ||
    process.env.EMAIL_FROM ||
    process.env.RESEND_FROM_EMAIL ||
    `noreply@example.com`
  );
}

interface SendEmailParams {
  tenantId: string;
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  tag?: string;
}

async function sendViaResendFallback(
  params: SendEmailParams,
  apiKey: string,
): Promise<{ messageId: string }> {
  const from = getFromEmail(params.tenantId);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: params.to,
      subject: params.subject,
      html: params.htmlBody,
      ...(params.textBody ? { text: params.textBody } : {}),
      tags: [{ name: 'category', value: params.tag || 'sequence' }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Resend send failed (${res.status}): ${detail.slice(0, 200)}`);
  }

  const body = (await res.json()) as { id?: string };
  return { messageId: body.id ?? '' };
}

/**
 * Send a single tenant-scoped email.
 *
 * Prefers Postmark (POSTMARK_SERVER_TOKEN) since it's what this module was
 * built around (tracked opens/links, Tag), but falls back to Resend
 * (RESEND_API_KEY) when Postmark isn't configured -- that's the provider
 * actually set up in production as of 2026-07-03 (see vibe-notes memory).
 * Without this fallback, every sequence send / lead-form notification /
 * welcome email silently throws in prod.
 */
export async function sendEmail(params: SendEmailParams): Promise<{ messageId: string }> {
  if (process.env.POSTMARK_SERVER_TOKEN) {
    const client = getPostmarkClient();
    const from = getFromEmail(params.tenantId);

    const result = await client.sendEmail({
      From: from,
      To: params.to,
      Subject: params.subject,
      HtmlBody: params.htmlBody,
      TextBody: params.textBody || '',
      Tag: params.tag || 'sequence',
      TrackOpens: true,
      TrackLinks: Models.LinkTrackingOptions.HtmlAndText,
      MessageStream: 'outbound',
    });

    return { messageId: result.MessageID };
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    return sendViaResendFallback(params, resendKey);
  }

  throw new Error('No email provider configured -- set POSTMARK_SERVER_TOKEN or RESEND_API_KEY');
}
