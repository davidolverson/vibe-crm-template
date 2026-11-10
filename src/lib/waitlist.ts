/**
 * Founding member spot counter.
 *
 * Today this is a static value. When the Neon WaitlistSignup table lands, this
 * swaps to `count(*) where is_founding_member = true` with a 60-second cache.
 * The landing page reads this in a RSC boundary so the value is always fresh
 * on navigation.
 */
export const FOUNDING_TOTAL = 50;
const FOUNDING_CLAIMED = Number(process.env.FOUNDING_CLAIMED_COUNT ?? '0');

export async function getFoundingSpotsRemaining(): Promise<number> {
  const claimed = Math.max(0, Math.min(FOUNDING_TOTAL, FOUNDING_CLAIMED));
  return FOUNDING_TOTAL - claimed;
}

export type WaitlistContext = 'hero' | 'founding' | 'final';

export function waitlistAdminEmail(params: {
  email: string;
  context: WaitlistContext;
  userAgent?: string;
  ip?: string;
}) {
  const { email, context, userAgent, ip } = params;
  const ctxLabel =
    context === 'founding'
      ? `Founding ${FOUNDING_TOTAL} claim`
      : context === 'hero'
        ? 'Hero CTA'
        : 'Final CTA';
  const subject = `[VIBE waitlist] ${ctxLabel} -- ${email}`;
  const text = [
    `New ${ctxLabel.toLowerCase()} on example.com.`,
    '',
    `Email:       ${email}`,
    `Context:     ${context}`,
    `User-Agent:  ${userAgent ?? 'unknown'}`,
    `IP:          ${ip ?? 'unknown'}`,
    `Timestamp:   ${new Date().toISOString()}`,
  ].join('\n');
  return { subject, text };
}
