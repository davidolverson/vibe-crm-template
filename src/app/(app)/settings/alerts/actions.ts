'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { withPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

export type ActionResult = { success: true } | { success: false; error: string };

const updateSchema = z.object({
  id: z.string().uuid(),
  enabled: z.boolean().optional(),
  thresholdValue: z.number().finite().nonnegative().optional(),
  thresholdUnit: z.enum(['percent', 'days', 'amount']).optional(),
});

export async function updateAlertRule(params: unknown): Promise<ActionResult> {
  return withPermission('settings.edit', async (ctx) => {
    const parsed = updateSchema.safeParse(params);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
    }
    const { id, enabled, thresholdValue, thresholdUnit } = parsed.data;

    const rule = await prisma.alertRule.findFirst({
      where: { id, tenantId: ctx.tenantId },
      select: { id: true },
    });
    if (!rule) return { success: false, error: 'Rule not found' };

    const data: Record<string, unknown> = {};
    if (enabled !== undefined) data.enabled = enabled;
    if (thresholdValue !== undefined) data.thresholdValue = thresholdValue;
    if (thresholdUnit !== undefined) data.thresholdUnit = thresholdUnit;

    if (Object.keys(data).length === 0) {
      return { success: true };
    }

    await prisma.alertRule.update({ where: { id }, data });
    revalidatePath('/settings/alerts');
    return { success: true };
  });
}
