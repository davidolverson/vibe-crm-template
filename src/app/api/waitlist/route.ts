import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';
import { sendPublicEmail } from '@/lib/public-email';
import { recordSubmission } from '@/lib/public-submissions';
import { waitlistAdminEmail, type WaitlistContext } from '@/lib/waitlist';

export const runtime = 'nodejs';

const bodySchema = z.object({
  email: z.string().email().max(254).trim().toLowerCase(),
  context: z.enum(['hero', 'founding', 'final']),
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
  const rl = rateLimit(`waitlist:${ip}`, 5, 60_000);
  if (!rl.success) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests. Try again in a minute.' },
      { status: 429 },
    );
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    const raw = await req.json();
    parsed = bodySchema.parse(raw);
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Please enter a valid email.' },
      { status: 400 },
    );
  }

  const userAgent = req.headers.get('user-agent') ?? undefined;
  const inbox = process.env.WAITLIST_INBOX ?? 'owner@example.com';

  const email = waitlistAdminEmail({
    email: parsed.email,
    context: parsed.context as WaitlistContext,
    userAgent,
    ip,
  });

  // Fire DB record + email in parallel. The DB write is lossless storage;
  // email is nice-to-have. A signup is "ok" as long as the DB capture works.
  const [dbResult, mailResult] = await Promise.allSettled([
    recordSubmission({
      kind: 'waitlist',
      email: parsed.email,
      context: parsed.context,
      ip,
      userAgent,
    }),
    sendPublicEmail({
      to: inbox,
      subject: email.subject,
      text: email.text,
      replyTo: parsed.email,
      skipUnsubscribe: true,
    }),
  ]);

  if (dbResult.status === 'rejected') {
    console.error('[waitlist] DB record failed:', dbResult.reason);
  }
  if (mailResult.status === 'rejected' || (mailResult.status === 'fulfilled' && !mailResult.value.ok)) {
    const reason =
      mailResult.status === 'rejected'
        ? mailResult.reason
        : mailResult.value.ok === false
          ? mailResult.value.reason
          : 'unknown';
    console.error('[waitlist] admin email failed:', reason);
  }

  return NextResponse.json({ ok: true });
}
