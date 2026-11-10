'use server';

import { revalidatePath } from 'next/cache';
import { withPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { sendSms } from '@/lib/twilio';

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function sendSmsToContact(
  contactId: string,
  body: string,
): Promise<ActionResult<{ smsMessageId: string }>> {
  return withPermission('contacts.edit', async (ctx) => {
    const trimmed = body.trim();
    if (!trimmed) return { success: false, error: 'Message body cannot be empty' };
    if (trimmed.length > 1600) return { success: false, error: 'Message is too long (max 1600 chars)' };

    const contact = await prisma.contact.findFirst({
      where: { id: contactId, tenantId: ctx.tenantId, deletedAt: null },
      select: { id: true, phone: true, smsOptOut: true },
    });
    if (!contact) return { success: false, error: 'Contact not found' };
    if (!contact.phone) return { success: false, error: 'Contact has no phone number' };
    if (contact.smsOptOut) return { success: false, error: 'Contact has opted out of SMS' };

    try {
      const result = await sendSms({
        tenantId: ctx.tenantId,
        contactId,
        toNumber: contact.phone,
        body: trimmed,
        userId: ctx.userId,
      });
      revalidatePath(`/contacts/${contactId}`);
      return { success: true, data: { smsMessageId: result.smsMessageId } };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to send SMS';
      return { success: false, error: msg };
    }
  });
}
