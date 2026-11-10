import { betterAuth } from 'better-auth';
import { organization } from 'better-auth/plugins';
import { nextCookies } from 'better-auth/next-js';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from './prisma';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      const resendKey = process.env.RESEND_API_KEY;
      const postmarkToken = process.env.POSTMARK_SERVER_TOKEN;
      const from =
        process.env.EMAIL_FROM ??
        process.env.RESEND_FROM_EMAIL ??
        process.env.POSTMARK_FROM_EMAIL ??
        'onboarding@resend.dev';
      const subject = 'Reset your VIBE password';
      const text = `Hi ${user.name ?? ''},\n\nClick the link below to set a new password. The link expires in 1 hour.\n\n${url}\n\nIf you didn't request this, you can safely ignore this email.\n\n-- VIBE`;
      const html = `
        <div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:#09090b;padding:40px 20px;color:#e4e4e7">
          <div style="max-width:480px;margin:0 auto;background:#18181b;border:1px solid #27272a;border-radius:12px;padding:32px">
            <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.2em;color:#D4A017;text-transform:uppercase">VIBE</p>
            <h1 style="margin:0 0 16px;font-size:20px;color:#fafafa">Reset your password</h1>
            <p style="margin:0 0 24px;color:#a1a1aa;line-height:1.55">Hi ${user.name ?? ''}, click the button below to set a new password. The link expires in 1 hour.</p>
            <a href="${url}" style="display:inline-block;background:#D4A017;color:#0A0A0F;font-weight:600;padding:10px 18px;border-radius:8px;text-decoration:none">Set new password</a>
            <p style="margin:24px 0 0;color:#71717a;font-size:12px">If you didn't request this, you can safely ignore this email.</p>
          </div>
        </div>`.trim();

      if (resendKey) {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ from, to: user.email, subject, text, html }),
        });
        if (!res.ok) {
          const body = await res.text();
          console.error('[auth] Resend reset email failed', res.status, body);
        }
        return;
      }

      if (postmarkToken) {
        const res = await fetch('https://api.postmarkapp.com/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Postmark-Server-Token': postmarkToken,
          },
          body: JSON.stringify({
            From: from,
            To: user.email,
            Subject: subject,
            TextBody: text,
            HtmlBody: html,
            MessageStream: 'outbound',
          }),
        });
        if (!res.ok) {
          const body = await res.text();
          console.error('[auth] Postmark reset email failed', res.status, body);
        }
        return;
      }

      console.log('[auth] no email provider configured -- reset link for', user.email, '\n', url);
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh after 1 day
  },
  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      organizationLimit: 5,
      membershipLimit: 50,
      creatorRole: 'owner',
      memberRole: 'member',
    }),
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
