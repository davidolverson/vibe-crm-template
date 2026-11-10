'use server';

import { revalidatePath } from 'next/cache';
import { withPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

export interface IdxConfig {
  vendor: '' | 'ihomefinder' | 'showcase_idx' | 'realtyna' | 'custom';
  widgetCode: string;
  disclaimer: string;
}

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

const MAX_WIDGET_LEN = 20_000;
const MAX_DISCLAIMER_LEN = 4_000;
const ALLOWED_VENDORS: IdxConfig['vendor'][] = ['', 'ihomefinder', 'showcase_idx', 'realtyna', 'custom'];

export async function saveIdxConfig(config: IdxConfig): Promise<ActionResult> {
  return withPermission('settings.edit', async (ctx) => {
    if (!ALLOWED_VENDORS.includes(config.vendor)) {
      return { success: false, error: 'Unknown IDX vendor' };
    }
    if (config.widgetCode.length > MAX_WIDGET_LEN) {
      return { success: false, error: `Widget code too long (max ${MAX_WIDGET_LEN} chars)` };
    }
    if (config.disclaimer.length > MAX_DISCLAIMER_LEN) {
      return { success: false, error: `Disclaimer too long (max ${MAX_DISCLAIMER_LEN} chars)` };
    }

    await prisma.tenantIdxConfig.upsert({
      where: { tenantId: ctx.tenantId },
      create: {
        tenantId: ctx.tenantId,
        vendor: config.vendor,
        widgetCode: config.widgetCode,
        disclaimer: config.disclaimer,
      },
      update: {
        vendor: config.vendor,
        widgetCode: config.widgetCode,
        disclaimer: config.disclaimer,
      },
    });

    revalidatePath('/settings/idx');
    return { success: true, data: undefined };
  });
}
