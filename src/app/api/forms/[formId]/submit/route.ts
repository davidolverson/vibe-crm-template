import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { trySendEmail } from '@/lib/email-sender';
import { formSubmissionAlert } from '@/lib/email-templates';

// ---------------------------------------------------------------------------
// In-memory rate limiter: 5 requests per minute per IP
// Uses a sliding window bucket. Suitable for single-instance deployments;
// for multi-instance scale-out, replace with a Redis-backed implementation.
// ---------------------------------------------------------------------------
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 5;

interface BucketEntry {
  count: number;
  windowStart: number;
}

const rateBuckets = new Map<string, BucketEntry>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateBuckets.get(ip);

  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rateBuckets.set(ip, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count += 1;
  return true;
}

// Prune stale buckets every 5 minutes to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateBuckets.entries()) {
    if (now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
      rateBuckets.delete(key);
    }
  }
}, 5 * 60_000);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

function json(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status });
}

// ---------------------------------------------------------------------------
// POST /api/forms/[formId]/submit
// Public endpoint -- no authentication required.
// ---------------------------------------------------------------------------
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
): Promise<NextResponse> {
  const { formId } = await params;

  // --- Rate limit ---
  const ip = getClientIp(req);
  if (!checkRateLimit(ip)) {
    return json(
      { success: false, error: 'Too many requests. Please wait a moment and try again.' },
      429
    );
  }

  // --- Validate formId is present ---
  if (!formId || typeof formId !== 'string') {
    return json({ success: false, error: 'Invalid form.' }, 400);
  }

  // --- Fetch form (no tenant context -- lookup by primary key) ---
  const form = await prisma.form.findUnique({
    where: { id: formId },
    select: {
      id: true,
      name: true,
      tenantId: true,
      active: true,
      defaultSequenceId: true,
      fields: {
        select: {
          id: true,
          label: true,
          type: true,
          required: true,
          position: true,
        },
        orderBy: { position: 'asc' },
      },
    },
  });

  if (!form) {
    return json({ success: false, error: 'Form not found.' }, 404);
  }

  if (!form.active) {
    return json({ success: false, error: 'This form is no longer accepting submissions.' }, 410);
  }

  // --- Parse body ---
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: 'Invalid JSON body.' }, 400);
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return json({ success: false, error: 'Request body must be a JSON object.' }, 400);
  }

  const payload = body as Record<string, unknown>;

  // --- Validate required fields ---
  const missingFields: string[] = [];
  for (const field of form.fields) {
    if (field.required) {
      const key = field.label.toLowerCase().replace(/\s+/g, '_');
      const val = payload[key] ?? payload[field.label] ?? payload[field.id];
      if (!val || (typeof val === 'string' && val.trim() === '')) {
        missingFields.push(field.label);
      }
    }
  }

  if (missingFields.length > 0) {
    return json(
      { success: false, error: `Missing required fields: ${missingFields.join(', ')}.` },
      422
    );
  }

  // --- Extract known contact fields from payload ---
  // Support both snake_case and original label keys
  function extract(...keys: string[]): string | undefined {
    for (const k of keys) {
      const val = payload[k];
      if (typeof val === 'string' && val.trim() !== '') {
        return val.trim();
      }
    }
    return undefined;
  }

  const firstName = extract('first_name', 'First Name', 'firstName');
  const lastName = extract('last_name', 'Last Name', 'lastName');
  const email = extract('email', 'Email');
  const phone = extract('phone', 'Phone');

  const contactName =
    firstName && lastName
      ? `${firstName} ${lastName}`
      : firstName ?? lastName ?? extract('name', 'Name') ?? 'Unknown';

  // --- Upsert contact (match on email within tenant, or create new) ---
  let contactId: string | undefined;

  if (email) {
    const existing = await prisma.contact.findFirst({
      where: { tenantId: form.tenantId, email, deletedAt: null },
      select: { id: true },
    });

    if (existing) {
      contactId = existing.id;
    } else {
      const created = await prisma.contact.create({
        data: {
          tenantId: form.tenantId,
          name: contactName,
          email,
          phone: phone ?? null,
          source: 'form',
          status: 'new',
        },
        select: { id: true },
      });
      contactId = created.id;
    }
  } else {
    // No email -- still create a contact record
    const created = await prisma.contact.create({
      data: {
        tenantId: form.tenantId,
        name: contactName,
        phone: phone ?? null,
        source: 'form',
        status: 'new',
      },
      select: { id: true },
    });
    contactId = created.id;
  }

  // --- Create submission record ---
  await prisma.formSubmission.create({
    data: {
      formId: form.id,
      tenantId: form.tenantId,
      contactId: contactId ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      payloadJson: payload as any,
      ipAddress: ip === 'unknown' ? null : ip,
    },
  });

  // --- Auto-enroll contact in the form's default sequence (if configured) ---
  if (contactId && form.defaultSequenceId) {
    void (async () => {
      try {
        const seq = await prisma.sequence.findFirst({
          where: { id: form.defaultSequenceId!, tenantId: form.tenantId, status: 'active' },
          select: {
            id: true,
            steps: {
              where: { stepOrder: 0 },
              select: { delayDays: true, delayHours: true },
              take: 1,
            },
          },
        });
        if (!seq) return;
        const firstStep = seq.steps[0];
        const delayMs = firstStep
          ? (firstStep.delayDays * 86400 + firstStep.delayHours * 3600) * 1000
          : 0;
        await prisma.sequenceEnrollment.upsert({
          where: {
            sequenceId_contactId: {
              sequenceId: seq.id,
              contactId: contactId,
            },
          },
          update: {},
          create: {
            tenantId: form.tenantId,
            sequenceId: seq.id,
            contactId: contactId,
            currentStep: 0,
            status: 'active',
            nextSendAt: new Date(Date.now() + delayMs),
          },
        });
      } catch (err) {
        console.error('[submit] auto-enroll failed', err);
      }
    })();
  }

  // --- Fire-and-forget: alert the tenant owner of the new lead ---
  void (async () => {
    try {
      // Find the Owner role for this tenant
      const ownerRole = await prisma.role.findFirst({
        where: { tenantId: form.tenantId, name: 'Owner' },
        select: { id: true },
      });

      if (!ownerRole) return;

      // Find the tenant user with that role
      const ownerMembership = await prisma.tenantUser.findFirst({
        where: { tenantId: form.tenantId, roleId: ownerRole.id, deletedAt: null },
        select: { userId: true },
      });

      if (!ownerMembership) return;

      // Look up the Better Auth user record for their email
      const ownerUser = await prisma.user.findUnique({
        where: { id: ownerMembership.userId },
        select: { email: true },
      });

      if (!ownerUser?.email) return;

      const template = formSubmissionAlert(form.name, contactName, email ?? '');

      await trySendEmail({
        tenantId: form.tenantId,
        to: ownerUser.email,
        subject: template.subject,
        htmlBody: template.htmlBody,
        textBody: template.textBody,
        tag: 'form-submission',
      });
    } catch (err) {
      console.error('[submit] Failed to send form submission alert:', err);
    }
  })();

  return json({ success: true });
}
