import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';
import { sendPublicEmail } from '@/lib/public-email';
import { recordSubmission } from '@/lib/public-submissions';
import {
  contactAdminEmail,
  contactAutoReplyEmail,
  type ContactReason,
} from '@/lib/contact';

export const runtime = 'nodejs';

const bodySchema = z.object({
  name: z.string().max(120).trim().optional(),
  email: z.string().email().max(254).trim().toLowerCase(),
  reason: z.enum(['founding', 'pricing', 'product', 'press', 'general']),
  message: z.string().min(5).max(4000).trim(),
});

function resolveIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}

export async function POST(req: NextRequest) {
  const ip = resolveIp(req);
  const rl = rateLimit(`contact:${ip}`, 3, 60_000);
  if (!rl.success) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests. Try again in a minute.' },
      { status: 429 },
    );
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Please check your name, email, and message.' },
      { status: 400 },
    );
  }

  const userAgent = req.headers.get('user-agent') ?? undefined;
  const inbox = process.env.CONTACT_INBOX ?? 'owner@example.com';

  const admin = contactAdminEmail({
    name: parsed.name,
    email: parsed.email,
    reason: parsed.reason as ContactReason,
    message: parsed.message,
    userAgent,
    ip,
  });
  const auto = contactAutoReplyEmail({ name: parsed.name });

  // Fire DB record + admin email + auto-reply in parallel. DB is lossless;
  // email is best-effort. Submission is "ok" as long as the DB capture works.
  const [dbResult, adminResult, autoResult] = await Promise.allSettled([
    recordSubmission({
      kind: 'contact',
      email: parsed.email,
      name: parsed.name,
      context: parsed.reason,
      message: parsed.message,
      ip,
      userAgent,
    }),
    sendPublicEmail({
      to: inbox,
      subject: admin.subject,
      text: admin.text,
      replyTo: parsed.email,
      skipUnsubscribe: true,
    }),
    sendPublicEmail({
      to: parsed.email,
      subject: auto.subject,
      text: auto.text,
    }),
  ]);

  if (dbResult.status === 'rejected') {
    console.error('[contact] DB record failed:', dbResult.reason);
  }
  if (adminResult.status === 'rejected' || (adminResult.status === 'fulfilled' && !adminResult.value.ok)) {
    const reason =
      adminResult.status === 'rejected'
        ? adminResult.reason
        : adminResult.value.ok === false
          ? adminResult.value.reason
          : 'unknown';
    console.error('[contact] admin email failed:', reason);
  }
  if (autoResult.status === 'rejected' || (autoResult.status === 'fulfilled' && !autoResult.value.ok)) {
    const reason =
      autoResult.status === 'rejected'
        ? autoResult.reason
        : autoResult.value.ok === false
          ? autoResult.value.reason
          : 'unknown';
    console.warn('[contact] auto-reply failed:', reason);
  }

  return NextResponse.json({ ok: true });
}
