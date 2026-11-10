export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireCronAuth } from '@/lib/cron-auth';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/postmark';
import { renderTemplate } from '@/lib/email-templates';

const BATCH_LIMIT = 200;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const unauthorized = requireCronAuth(req);
  if (unauthorized) return unauthorized;

  const startedAt = Date.now();
  const now = new Date();
  let processed = 0;
  let sent = 0;
  let errors = 0;

  const due = await prisma.sequenceEnrollment.findMany({
    where: { status: 'active', nextSendAt: { lte: now } },
    take: BATCH_LIMIT,
    include: {
      sequence: { include: { steps: { orderBy: { stepOrder: 'asc' } } } },
      contact: { select: { id: true, email: true, name: true, emailOptOut: true, tenantId: true } },
    },
  });

  // Claim sentinel: push nextSendAt out by 10 min so this row is invisible to
  // concurrent invocations. If this worker crashes before completing, the row
  // will automatically come back into scope after the sentinel passes.
  const claimSentinel = new Date(Date.now() + 10 * 60_000);

  for (const enr of due) {
    processed++;

    // Atomic claim -- only one worker can own this row.
    const claim = await prisma.sequenceEnrollment.updateMany({
      where: { id: enr.id, status: 'active', nextSendAt: { lte: now } },
      data: { nextSendAt: claimSentinel },
    });
    if (claim.count === 0) continue; // another worker already picked it up

    try {
      if (enr.sequence.status !== 'active') continue;
      if (enr.contact.emailOptOut) {
        await prisma.sequenceEnrollment.update({
          where: { id: enr.id },
          data: { status: 'unsubscribed' },
        });
        continue;
      }

      const step = enr.sequence.steps[enr.currentStep];
      if (!step) {
        await prisma.sequenceEnrollment.update({
          where: { id: enr.id },
          data: { status: 'completed', nextSendAt: null },
        });
        continue;
      }

      if (step.type === 'email' && step.templateId && enr.contact.email) {
        const tpl = await prisma.emailTemplate.findUnique({ where: { id: step.templateId } });
        if (tpl) {
          const vars = { contact_name: enr.contact.name, contact_email: enr.contact.email };
          const subject = renderTemplate(tpl.subject, vars);
          const body = renderTemplate(tpl.body, vars);
          const result = await sendEmail({
            tenantId: enr.tenantId,
            to: enr.contact.email,
            subject,
            htmlBody: body,
            tag: `sequence-${enr.sequenceId}`,
          });
          await prisma.emailSend.create({
            data: {
              tenantId: enr.tenantId,
              contactId: enr.contactId,
              templateId: tpl.id,
              sequenceId: enr.sequenceId,
              postmarkMsgId: result.messageId,
              toEmail: enr.contact.email,
              status: 'sent',
            },
          });
          sent++;
        }
      }
      // Note: sms step type requires tenant Twilio config. Skip if not configured.
      // wait step type = no-op, just advance.

      const nextStep = enr.currentStep + 1;
      const next = enr.sequence.steps[nextStep];
      const nextSendAt = next
        ? new Date(Date.now() + (next.delayDays * 86400 + next.delayHours * 3600) * 1000)
        : null;

      await prisma.sequenceEnrollment.update({
        where: { id: enr.id },
        data: {
          currentStep: nextStep,
          nextSendAt,
          status: next ? 'active' : 'completed',
        },
      });
    } catch (err) {
      errors++;
      console.error('[cron:sequence-runner] enrollment error', enr.id, err);
    }
  }

  return NextResponse.json({
    ok: true,
    job: 'sequence-runner',
    processed,
    sent,
    errors,
    durationMs: Date.now() - startedAt,
    ts: startedAt,
  });
}
