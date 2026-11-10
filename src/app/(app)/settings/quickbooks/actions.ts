'use server';

import { revalidatePath } from 'next/cache';
import { withPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { getQboAuthUrl, syncQboData } from '@/lib/qbo';

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function getQboConnectUrl(): Promise<ActionResult<{ url: string }>> {
  return withPermission('settings.edit', async (ctx) => {
    try {
      const url = getQboAuthUrl(ctx.tenantId);
      return { success: true, data: { url } };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'QBO config missing';
      return { success: false, error: msg };
    }
  });
}

export async function disconnectQbo(): Promise<ActionResult> {
  return withPermission('settings.edit', async (ctx) => {
    await prisma.qboConnection.deleteMany({ where: { tenantId: ctx.tenantId } });
    revalidatePath('/settings/quickbooks');
    return { success: true, data: undefined };
  });
}

export async function forceSyncQbo(): Promise<ActionResult<{ invoices: number; payments: number }>> {
  return withPermission('settings.edit', async (ctx) => {
    try {
      const result = await syncQboData(ctx.tenantId);
      if (result.errors.length) {
        return { success: false, error: result.errors.join('; ') };
      }
      revalidatePath('/settings/quickbooks');
      return {
        success: true,
        data: { invoices: result.invoicesSynced, payments: result.paymentsSynced },
      };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Sync failed' };
    }
  });
}
