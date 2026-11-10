/**
 * Shared helpers for the public /contact form + /api/contact route.
 * Keeps Postmark + copy + inbox routing in one place so future tweaks
 * (e.g. swapping Postmark for Resend) touch exactly one file.
 */

export const CONTACT_SUBJECT_PREFIX = '[VIBE contact]';

export type ContactReason =
  | 'founding'
  | 'pricing'
  | 'product'
  | 'press'
  | 'general';

export const REASON_LABELS: Record<ContactReason, string> = {
  founding: 'Founding 50 inquiry',
  pricing: 'Pricing / plan question',
  product: 'Product question',
  press: 'Press / partnership',
  general: 'Something else',
};

export function contactAdminEmail(params: {
  name?: string;
  email: string;
  reason: ContactReason;
  message: string;
  userAgent?: string;
  ip?: string;
}) {
  const { name, email, reason, message, userAgent, ip } = params;
  const subject = `${CONTACT_SUBJECT_PREFIX} ${REASON_LABELS[reason]} -- ${email}`;
  const text = [
    `New contact form on example.com.`,
    '',
    `Reason:      ${REASON_LABELS[reason]}`,
    `Name:        ${name ?? '(not provided)'}`,
    `Email:       ${email}`,
    `User-Agent:  ${userAgent ?? 'unknown'}`,
    `IP:          ${ip ?? 'unknown'}`,
    `Timestamp:   ${new Date().toISOString()}`,
    '',
    '-- Message --',
    message.trim(),
  ].join('\n');
  return { subject, text };
}

export function contactAutoReplyEmail(params: { name?: string }) {
  const greeting = params.name ? `${params.name},` : 'Hello,';
  const subject = 'We got your message -- VIBE';
  const text = [
    greeting,
    '',
    "Thanks for reaching out. A human on the VIBE team will reply within one business day.",
    '',
    "In the meantime, VIBE is live and the Founding 50 is open. If you're claiming a founding spot, we'll confirm your seat in the same reply.",
    '',
    '-- The VIBE team',
    'example.com',
  ].join('\n');
  return { subject, text };
}
