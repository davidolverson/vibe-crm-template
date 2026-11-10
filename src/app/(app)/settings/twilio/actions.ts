'use server';

import { revalidatePath } from 'next/cache';
import { withPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';
import { validateTwilioCredentials } from '@/lib/twilio';

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function saveTwilioCredentials(
  accountSid: string,
  authToken: string,
): Promise<ActionResult> {
  return withPermission('settings.edit', async (ctx) => {
    if (!accountSid.trim() || !authToken.trim()) {
      return { success: false, error: 'Account SID and Auth Token are required' };
    }

    const check = await validateTwilioCredentials(accountSid.trim(), authToken.trim());
    if (!check.valid) {
      return { success: false, error: check.error ?? 'Twilio validation failed' };
    }

    await prisma.tenantTwilioConfig.upsert({
      where: { tenantId: ctx.tenantId },
      create: {
        tenantId: ctx.tenantId,
        accountSid: encrypt(accountSid.trim()),
        authToken: encrypt(authToken.trim()),
      },
      update: {
        accountSid: encrypt(accountSid.trim()),
        authToken: encrypt(authToken.trim()),
      },
    });

    revalidatePath('/settings/twilio');
    return { success: true, data: undefined };
  });
}

export async function addPhoneNumber(
  phoneNumber: string,
  twilioSid: string,
  friendlyName: string | null,
  setAsDefault: boolean,
): Promise<ActionResult> {
  return withPermission('settings.edit', async (ctx) => {
    if (!phoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
      return { success: false, error: 'Phone must be E.164 format (e.g. +14155551234)' };
    }

    const config = await prisma.tenantTwilioConfig.findUnique({
      where: { tenantId: ctx.tenantId },
    });
    if (!config) {
      return { success: false, error: 'Connect your Twilio account first' };
    }

    if (setAsDefault) {
      await prisma.tenantPhoneNumber.updateMany({
        where: { tenantId: ctx.tenantId },
        data: { isDefault: false },
      });
    }

    await prisma.tenantPhoneNumber.create({
      data: {
        tenantId: ctx.tenantId,
        twilioConfigId: config.id,
        phoneNumber: phoneNumber.trim(),
        twilioSid: twilioSid.trim(),
        friendlyName: friendlyName?.trim() || null,
        isDefault: setAsDefault,
      },
    });

    revalidatePath('/settings/twilio');
    return { success: true, data: undefined };
  });
}

export async function removePhoneNumber(phoneId: string): Promise<ActionResult> {
  return withPermission('settings.edit', async (ctx) => {
    const existing = await prisma.tenantPhoneNumber.findFirst({
      where: { id: phoneId, tenantId: ctx.tenantId },
    });
    if (!existing) return { success: false, error: 'Phone not found' };

    await prisma.tenantPhoneNumber.delete({ where: { id: phoneId } });
    revalidatePath('/settings/twilio');
    return { success: true, data: undefined };
  });
}

export async function setDefaultPhone(phoneId: string): Promise<ActionResult> {
  return withPermission('settings.edit', async (ctx) => {
    await prisma.$transaction([
      prisma.tenantPhoneNumber.updateMany({
        where: { tenantId: ctx.tenantId },
        data: { isDefault: false },
      }),
      prisma.tenantPhoneNumber.update({
        where: { id: phoneId },
        data: { isDefault: true },
      }),
    ]);
    revalidatePath('/settings/twilio');
    return { success: true, data: undefined };
  });
}

export async function disconnectTwilio(): Promise<ActionResult> {
  return withPermission('settings.edit', async (ctx) => {
    await prisma.tenantPhoneNumber.deleteMany({ where: { tenantId: ctx.tenantId } });
    await prisma.tenantTwilioConfig.deleteMany({ where: { tenantId: ctx.tenantId } });
    revalidatePath('/settings/twilio');
    return { success: true, data: undefined };
  });
}
