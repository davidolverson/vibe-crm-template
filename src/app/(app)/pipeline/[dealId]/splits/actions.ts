'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { withPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { deriveSourceForDeal } from '@/lib/commission-splits';

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

const createSchema = z.object({
  dealId: z.string().uuid(),
  payeeType: z.enum(['user', 'contact', 'entity']),
  // Better Auth user IDs are not UUIDs; contact/entity IDs are. Accept both.
  payeeId: z.string().min(1).max(64),
  percentBps: z.number().int().min(0).max(10000),
  amountCents: z.number().int().min(0).optional(),
  note: z.string().max(500).optional(),
});

export async function createSplit(params: unknown): Promise<ActionResult<{ id: string }>> {
  return withPermission('deals.edit', async (ctx) => {
    const parsed = createSchema.safeParse(params);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
    const { dealId, payeeType, payeeId, percentBps, amountCents, note } = parsed.data;

    const deal = await prisma.deal.findFirst({ where: { id: dealId, tenantId: ctx.tenantId } });
    if (!deal) return { success: false, error: 'Deal not found' };

    const source = await deriveSourceForDeal(ctx.tenantId, dealId);

    const row = await prisma.commissionSplit.create({
      data: {
        tenantId: ctx.tenantId,
        dealId,
        source,
        payeeType,
        payeeUserId: payeeType === 'user' ? payeeId : null,
        payeeContactId: payeeType === 'contact' ? payeeId : null,
        payeeEntityId: payeeType === 'entity' ? payeeId : null,
        percentBps,
        amountCents: BigInt(amountCents ?? 0),
        note: note ?? null,
      },
    });

    revalidatePath(`/pipeline/${dealId}`);
    revalidatePath(`/pipeline/${dealId}/splits`);
    return { success: true, data: { id: row.id } };
  });
}

const updateSchema = z.object({
  id: z.string().min(1).max(64),
  dealId: z.string().uuid(),
  percentBps: z.number().int().min(0).max(10000).optional(),
  amountCents: z.number().int().min(0).optional(),
  note: z.string().max(500).nullable().optional(),
  paid: z.boolean().optional(),
});

export async function updateSplit(params: unknown): Promise<ActionResult> {
  return withPermission('deals.edit', async (ctx) => {
    const parsed = updateSchema.safeParse(params);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
    const { id, dealId, percentBps, amountCents, note, paid } = parsed.data;

    const split = await prisma.commissionSplit.findFirst({
      where: { id, tenantId: ctx.tenantId, dealId },
    });
    if (!split) return { success: false, error: 'Split not found' };

    const data: Record<string, unknown> = {};
    if (percentBps !== undefined) data.percentBps = percentBps;
    if (amountCents !== undefined) data.amountCents = BigInt(amountCents);
    if (note !== undefined) data.note = note;
    if (paid !== undefined) data.paidAt = paid ? new Date() : null;

    if (Object.keys(data).length === 0) return { success: true, data: undefined };

    await prisma.commissionSplit.update({ where: { id }, data });
    revalidatePath(`/pipeline/${dealId}/splits`);
    return { success: true, data: undefined };
  });
}

export async function deleteSplit(id: string, dealId: string): Promise<ActionResult> {
  return withPermission('deals.edit', async (ctx) => {
    const split = await prisma.commissionSplit.findFirst({
      where: { id, tenantId: ctx.tenantId, dealId },
    });
    if (!split) return { success: false, error: 'Split not found' };
    await prisma.commissionSplit.delete({ where: { id } });
    revalidatePath(`/pipeline/${dealId}/splits`);
    return { success: true, data: undefined };
  });
}
