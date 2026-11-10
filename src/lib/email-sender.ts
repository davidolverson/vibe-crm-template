import { sendEmail } from './postmark';

interface TrySendEmailParams {
  tenantId: string;
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  tag?: string;
}

/**
 * Safe wrapper around sendEmail.
 *
 * Catches and logs all errors so a missing/misconfigured email provider
 * (or any transient delivery failure) never crashes the caller. sendEmail()
 * itself falls back from Postmark to Resend depending on which is configured.
 *
 * All emails are fire-and-forget -- call without await in hot paths.
 */
export async function trySendEmail(params: TrySendEmailParams): Promise<void> {
  if (!process.env.POSTMARK_SERVER_TOKEN && !process.env.RESEND_API_KEY) {
    console.warn(
      '[email-sender] No email provider configured (POSTMARK_SERVER_TOKEN / RESEND_API_KEY) -- skipping email to',
      params.to,
    );
    return;
  }

  try {
    const result = await sendEmail(params);
    console.log('[email-sender] Sent to', params.to, '| messageId:', result.messageId);
  } catch (err) {
    console.error('[email-sender] Failed to send email to', params.to, err);
  }
}
