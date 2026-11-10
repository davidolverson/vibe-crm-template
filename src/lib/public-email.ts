/**
 * Minimal email sender for the PUBLIC marketing surface (waitlist, contact,
 * auto-replies). Distinct from `src/lib/postmark.ts` which is tenant-scoped
 * and throws when unconfigured.
 *
 * Provider cascade (first match wins):
 *   1. RESEND_API_KEY     → Resend (3k/mo free, preferred)
 *   2. POSTMARK_SERVER_TOKEN → Postmark
 *   3. none               → simulated send (log to stdout)
 *
 * Every send automatically gets CAN-SPAM-compliant List-Unsubscribe +
 * List-Unsubscribe-Post headers (RFC 8058 one-click) pointing at
 * /api/unsubscribe with an HMAC-signed token.
 */

import { buildUnsubscribeUrl } from './unsubscribe';

export type PublicEmailParams = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  /** Set true to skip List-Unsubscribe headers (transactional auth emails only -- e.g. password reset). */
  skipUnsubscribe?: boolean;
};

export type PublicEmailResult =
  | { ok: true; simulated?: boolean; provider?: 'resend' | 'postmark' }
  | { ok: false; reason: string };

const DEFAULT_FROM = 'onboarding@resend.dev';

function resolveFrom(): string {
  // EMAIL_FROM wins if set -- gives flexibility for local dev with a sandbox.
  // POSTMARK_FROM_EMAIL kept as a compat shim since earlier code used it.
  return (
    process.env.EMAIL_FROM ||
    process.env.RESEND_FROM_EMAIL ||
    process.env.POSTMARK_FROM_EMAIL ||
    DEFAULT_FROM
  );
}

function resolveOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BETTER_AUTH_URL ||
    'https://www.example.com'
  );
}

/**
 * Returns { List-Unsubscribe, List-Unsubscribe-Post } for the given recipient,
 * or null if the unsubscribe token cannot be generated (e.g. ENCRYPTION_KEY
 * not set). Callers must handle null gracefully -- unsub headers are required
 * by CAN-SPAM for marketing mail but omitting them should NOT crash the send.
 */
function unsubscribeHeaders(to: string): { listUnsubscribe: string; listUnsubscribePost: string } | null {
  try {
    const url = buildUnsubscribeUrl(to, resolveOrigin());
    return {
      listUnsubscribe: `<${url}>`,
      listUnsubscribePost: 'List-Unsubscribe=One-Click',
    };
  } catch (err) {
    console.warn(
      '[public-email] unable to build unsubscribe URL -- sending without List-Unsubscribe headers. Set ENCRYPTION_KEY to fix. Error:',
      err instanceof Error ? err.message : 'unknown',
    );
    return null;
  }
}

async function sendViaResend(
  params: PublicEmailParams,
  apiKey: string,
): Promise<PublicEmailResult> {
  const unsub = params.skipUnsubscribe ? null : unsubscribeHeaders(params.to);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: resolveFrom(),
      to: params.to,
      subject: params.subject,
      text: params.text,
      ...(params.html ? { html: params.html } : {}),
      ...(params.replyTo ? { reply_to: params.replyTo } : {}),
      ...(unsub
        ? {
            headers: {
              'List-Unsubscribe': unsub.listUnsubscribe,
              'List-Unsubscribe-Post': unsub.listUnsubscribePost,
            },
          }
        : {}),
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    return {
      ok: false,
      reason: `resend ${res.status}: ${detail.slice(0, 200)}`,
    };
  }
  return { ok: true, provider: 'resend' };
}

async function sendViaPostmark(
  params: PublicEmailParams,
  token: string,
): Promise<PublicEmailResult> {
  const unsub = params.skipUnsubscribe ? null : unsubscribeHeaders(params.to);
  const body: Record<string, unknown> = {
    From: resolveFrom(),
    To: params.to,
    Subject: params.subject,
    TextBody: params.text,
    MessageStream: 'outbound',
  };
  if (params.html) body.HtmlBody = params.html;
  if (params.replyTo) body.ReplyTo = params.replyTo;
  if (unsub) {
    body.Headers = [
      { Name: 'List-Unsubscribe', Value: unsub.listUnsubscribe },
      { Name: 'List-Unsubscribe-Post', Value: unsub.listUnsubscribePost },
    ];
  }

  const res = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Postmark-Server-Token': token,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    return {
      ok: false,
      reason: `postmark ${res.status}: ${detail.slice(0, 200)}`,
    };
  }
  return { ok: true, provider: 'postmark' };
}

export async function sendPublicEmail(
  params: PublicEmailParams,
): Promise<PublicEmailResult> {
  const resendKey = process.env.RESEND_API_KEY;
  const postmarkToken = process.env.POSTMARK_SERVER_TOKEN;

  if (resendKey) return sendViaResend(params, resendKey);
  if (postmarkToken) return sendViaPostmark(params, postmarkToken);

  console.log('[public-email] no provider configured -- simulated send');
  console.log(`  To:      ${params.to}`);
  console.log(`  From:    ${resolveFrom()}`);
  console.log(`  Subject: ${params.subject}`);
  console.log(`  Body:\n${params.text}`);
  return { ok: true, simulated: true };
}
