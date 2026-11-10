'use server';

import { revalidatePath } from 'next/cache';
import { withPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { enforcePlanLimit } from '@/lib/plan-enforcement';

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function createSequence(name: string): Promise<ActionResult<{ id: string }>> {
  return withPermission('sequences.create', async (ctx) => {
    if (!name.trim()) return { success: false, error: 'Name required' };
    try {
      await enforcePlanLimit(ctx.tenantId, 'sequences');
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Plan limit exceeded' };
    }
    const seq = await prisma.sequence.create({
      data: { tenantId: ctx.tenantId, name: name.trim(), createdBy: ctx.userId },
    });
    revalidatePath('/sequences');
    return { success: true, data: { id: seq.id } };
  });
}

export async function updateSequenceStatus(
  id: string,
  status: 'draft' | 'active' | 'paused',
): Promise<ActionResult> {
  return withPermission('sequences.edit', async (ctx) => {
    const seq = await prisma.sequence.findFirst({ where: { id, tenantId: ctx.tenantId } });
    if (!seq) return { success: false, error: 'Not found' };
    await prisma.sequence.update({ where: { id }, data: { status } });
    revalidatePath('/sequences');
    return { success: true, data: undefined };
  });
}

export async function deleteSequence(id: string): Promise<ActionResult> {
  return withPermission('sequences.delete', async (ctx) => {
    const seq = await prisma.sequence.findFirst({ where: { id, tenantId: ctx.tenantId } });
    if (!seq) return { success: false, error: 'Not found' };
    await prisma.sequence.delete({ where: { id } });
    revalidatePath('/sequences');
    return { success: true, data: undefined };
  });
}

export async function addStep(params: {
  sequenceId: string;
  type: 'email' | 'sms' | 'wait';
  templateId?: string;
  smsBody?: string;
  delayDays: number;
  delayHours: number;
}): Promise<ActionResult> {
  return withPermission('sequences.edit', async (ctx) => {
    const seq = await prisma.sequence.findFirst({
      where: { id: params.sequenceId, tenantId: ctx.tenantId },
      include: { _count: { select: { steps: true } } },
    });
    if (!seq) return { success: false, error: 'Sequence not found' };

    if (params.type === 'email' && !params.templateId) {
      return { success: false, error: 'Email step requires a template' };
    }
    if (params.type === 'sms' && !params.smsBody?.trim()) {
      return { success: false, error: 'SMS step requires a body' };
    }

    await prisma.sequenceStep.create({
      data: {
        sequenceId: params.sequenceId,
        stepOrder: seq._count.steps,
        type: params.type,
        templateId: params.type === 'email' ? params.templateId ?? null : null,
        smsBody: params.type === 'sms' ? params.smsBody?.trim() ?? null : null,
        delayDays: Math.max(0, Math.min(365, params.delayDays)),
        delayHours: Math.max(0, Math.min(23, params.delayHours)),
      },
    });
    revalidatePath('/sequences');
    return { success: true, data: undefined };
  });
}

export async function removeStep(stepId: string): Promise<ActionResult> {
  return withPermission('sequences.edit', async (ctx) => {
    const step = await prisma.sequenceStep.findUnique({
      where: { id: stepId },
      include: { sequence: true },
    });
    if (!step || step.sequence.tenantId !== ctx.tenantId) {
      return { success: false, error: 'Step not found' };
    }
    await prisma.sequenceStep.delete({ where: { id: stepId } });
    // Recompact step orders
    const remaining = await prisma.sequenceStep.findMany({
      where: { sequenceId: step.sequenceId },
      orderBy: { stepOrder: 'asc' },
    });
    await prisma.$transaction(
      remaining.map((s, i) =>
        prisma.sequenceStep.update({ where: { id: s.id }, data: { stepOrder: i } }),
      ),
    );
    revalidatePath('/sequences');
    return { success: true, data: undefined };
  });
}

export async function enrollContactInSequence(
  contactId: string,
  sequenceId: string,
): Promise<ActionResult> {
  return withPermission('sequences.edit', async (ctx) => {
    const [seq, contact] = await Promise.all([
      prisma.sequence.findFirst({
        where: { id: sequenceId, tenantId: ctx.tenantId, status: 'active' },
        include: { steps: { orderBy: { stepOrder: 'asc' }, take: 1 } },
      }),
      prisma.contact.findFirst({
        where: { id: contactId, tenantId: ctx.tenantId, deletedAt: null },
        select: { id: true, emailOptOut: true },
      }),
    ]);

    if (!seq) return { success: false, error: 'Sequence not found or not active' };
    if (!contact) return { success: false, error: 'Contact not found' };
    if (contact.emailOptOut) return { success: false, error: 'Contact has opted out' };
    if (seq.steps.length === 0) return { success: false, error: 'Sequence has no steps' };

    const firstStep = seq.steps[0];
    const nextSendAt = new Date(
      Date.now() + (firstStep.delayDays * 86400 + firstStep.delayHours * 3600) * 1000,
    );

    await prisma.sequenceEnrollment.upsert({
      where: { sequenceId_contactId: { sequenceId, contactId } },
      create: {
        tenantId: ctx.tenantId,
        sequenceId,
        contactId,
        currentStep: 0,
        status: 'active',
        nextSendAt,
      },
      update: {
        status: 'active',
        currentStep: 0,
        nextSendAt,
      },
    });

    revalidatePath(`/contacts/${contactId}`);
    revalidatePath('/sequences');
    return { success: true, data: undefined };
  });
}
