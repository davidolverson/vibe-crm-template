'use server';

import { revalidatePath } from 'next/cache';
import { withPermission } from '@/lib/permissions';
import { getTenantDb } from '@/lib/prisma-tenant';
import { sanitizeString } from '@/lib/sanitize';
import { DealCreateSchema } from '@/lib/validations/deal';
import { z } from 'zod';
import { DealStatus } from '@/generated/prisma/enums';
import type { DealUncheckedCreateInput } from '@/generated/prisma/models/Deal';
import type { DealActivityUncheckedCreateInput } from '@/generated/prisma/models/DealActivity';
import { createNotification } from '@/lib/notifications';

type ActionResult = { success: boolean; error?: string };

function extractFormData(formData: FormData): Record<string, string | number | undefined> {
  const result: Record<string, string | number | undefined> = {};
  formData.forEach((val, key) => {
    if (typeof val === 'string' && val.trim() !== '') {
      result[key] = sanitizeString(val);
    }
  });
  // Coerce value field to number for schema
  if (typeof result['value'] === 'string') {
    const parsed = parseFloat(result['value']);
    result['value'] = isNaN(parsed) ? undefined : parsed;
  }
  return result;
}

export async function createDeal(formData: FormData): Promise<ActionResult> {
  try {
    return await withPermission('deals.create', async (ctx) => {
      const raw = extractFormData(formData);
      const parsed = DealCreateSchema.safeParse(raw);

      if (!parsed.success) {
        return {
          success: false,
          error: parsed.error.issues[0]?.message ?? 'Validation failed',
        };
      }

      const { title, value, contactId, stageId, expectedCloseDate, assignedToUserId } =
        parsed.data;

      const db = getTenantDb();

      const deal = await db.deal.create({
        data: {
          name: title,
          value: value ?? null,
          contactId,
          stageId,
          assignedToUserId: assignedToUserId ?? null,
          expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
          status: DealStatus.open,
          stageChangedAt: new Date(),
        } as DealUncheckedCreateInput,
      });

      await db.dealActivity.create({
        data: {
          dealId: deal.id,
          userId: ctx.userId,
          type: 'stage_change',
          description: 'Deal created',
        } as DealActivityUncheckedCreateInput,
      });

      revalidatePath('/pipeline');
      return { success: true };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create deal';
    return { success: false, error: message };
  }
}

const DealEditSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  value: z.number().nonnegative('Value must be 0 or greater').nullable(),
  expectedCloseDate: z.iso.date().nullable(),
});

export type DealEditFields = z.infer<typeof DealEditSchema>;

export async function updateDeal(
  dealId: string,
  fields: DealEditFields
): Promise<ActionResult> {
  try {
    return await withPermission('deals.edit', async (ctx) => {
      const parsed = DealEditSchema.safeParse(fields);

      if (!parsed.success) {
        return {
          success: false,
          error: parsed.error.issues[0]?.message ?? 'Validation failed',
        };
      }

      const { name: rawName, value, expectedCloseDate } = parsed.data;
      const name = sanitizeString(rawName);

      const db = getTenantDb();

      await db.deal.update({
        where: { id: dealId },
        data: {
          name,
          value: value ?? null,
          expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
        },
      });

      await db.dealActivity.create({
        data: {
          dealId,
          userId: ctx.userId,
          type: 'field_change',
          description: 'Deal details updated',
        } as DealActivityUncheckedCreateInput,
      });

      revalidatePath('/pipeline');
      return { success: true };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update deal';
    return { success: false, error: message };
  }
}

export async function moveDeal(dealId: string, newStageId: string): Promise<ActionResult> {
  try {
    return await withPermission('pipeline.edit', async (ctx) => {
      const db = getTenantDb();

      const [updatedDeal, stage] = await Promise.all([
        db.deal.update({
          where: { id: dealId },
          data: {
            stageId: newStageId,
            stageChangedAt: new Date(),
          },
          select: { name: true },
        }),
        db.pipelineStage.findUnique({
          where: { id: newStageId },
          select: { name: true },
        }),
      ]);

      await db.dealActivity.create({
        data: {
          dealId,
          userId: ctx.userId,
          type: 'stage_change',
          description: 'Deal moved to new stage',
        } as DealActivityUncheckedCreateInput,
      });

      void createNotification(
        ctx.userId,
        ctx.tenantId,
        'deal_moved',
        `Deal '${updatedDeal.name}' moved to ${stage?.name ?? 'new stage'}`,
        '/pipeline'
      );

      revalidatePath('/pipeline');
      return { success: true };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to move deal';
    return { success: false, error: message };
  }
}

export async function closeDeal(
  dealId: string,
  status: 'won' | 'lost',
  reason?: string
): Promise<ActionResult> {
  try {
    return await withPermission('pipeline.edit', async (ctx) => {
      const db = getTenantDb();
      const sanitizedReason = reason ? sanitizeString(reason) : null;

      const updatedDeal = await db.deal.update({
        where: { id: dealId },
        data: {
          status: status === 'won' ? DealStatus.won : DealStatus.lost,
          closedAt: new Date(),
          lostReason: status === 'lost' ? (sanitizedReason ?? null) : null,
        },
        select: { name: true },
      });

      void createNotification(
        ctx.userId,
        ctx.tenantId,
        'deal_moved',
        `Deal '${updatedDeal.name}' closed as ${status}`,
        '/pipeline'
      );

      revalidatePath('/pipeline');
      return { success: true };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to close deal';
    return { success: false, error: message };
  }
}
