'use server';

import { revalidatePath } from 'next/cache';
import { withPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import type { AutomationTrigger } from '@/generated/prisma/enums';

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

export type ActionSpec =
  | { kind: 'notify_user' }
  | { kind: 'notify_role'; role: 'Owner' | 'Admin' | 'Producer' }
  | { kind: 'create_task'; title: string }
  | { kind: 'enroll_in_sequence'; sequenceId: string };

export type ConditionSpec = {
  windowMinutes?: number;
  fromStageId?: string;
  toStageId?: string;
};

export async function createAutomation(params: {
  name: string;
  triggerType: AutomationTrigger;
  conditions: ConditionSpec;
  actions: ActionSpec;
}): Promise<ActionResult<{ id: string }>> {
  return withPermission('automations.create', async (ctx) => {
    if (!params.name.trim()) return { success: false, error: 'Name required' };

    const row = await prisma.automation.create({
      data: {
        tenantId: ctx.tenantId,
        name: params.name.trim(),
        triggerType: params.triggerType,
        conditionsJson: params.conditions as unknown as object,
        actionsJson: params.actions as unknown as object,
        enabled: true,
      },
    });

    revalidatePath('/automations');
    return { success: true, data: { id: row.id } };
  });
}

export async function toggleAutomation(
  id: string,
  enabled: boolean,
): Promise<ActionResult> {
  return withPermission('automations.edit', async (ctx) => {
    const row = await prisma.automation.findFirst({ where: { id, tenantId: ctx.tenantId } });
    if (!row) return { success: false, error: 'Not found' };
    await prisma.automation.update({ where: { id }, data: { enabled } });
    revalidatePath('/automations');
    return { success: true, data: undefined };
  });
}

export async function updateAutomation(
  id: string,
  params: {
    name: string;
    triggerType: AutomationTrigger;
    conditions: ConditionSpec;
    actions: ActionSpec;
  },
): Promise<ActionResult> {
  return withPermission('automations.edit', async (ctx) => {
    if (!params.name.trim()) return { success: false, error: 'Name required' };
    const row = await prisma.automation.findFirst({ where: { id, tenantId: ctx.tenantId } });
    if (!row) return { success: false, error: 'Not found' };
    await prisma.automation.update({
      where: { id },
      data: {
        name: params.name.trim(),
        triggerType: params.triggerType,
        conditionsJson: params.conditions as unknown as object,
        actionsJson: params.actions as unknown as object,
      },
    });
    revalidatePath('/automations');
    return { success: true, data: undefined };
  });
}

export async function deleteAutomation(id: string): Promise<ActionResult> {
  return withPermission('automations.delete', async (ctx) => {
    const row = await prisma.automation.findFirst({ where: { id, tenantId: ctx.tenantId } });
    if (!row) return { success: false, error: 'Not found' };
    await prisma.automation.delete({ where: { id } });
    revalidatePath('/automations');
    return { success: true, data: undefined };
  });
}
