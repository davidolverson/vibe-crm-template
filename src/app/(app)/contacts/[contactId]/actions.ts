'use server';

import { revalidatePath } from 'next/cache';
import { withPermission } from '@/lib/permissions';
import { getTenantDb } from '@/lib/prisma-tenant';
import { sanitizeString } from '@/lib/sanitize';
import type { ActivityUncheckedCreateInput } from '@/generated/prisma/models/Activity';

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

export async function createNote(
  contactId: string,
  body: string
): Promise<ActionResult<{ id: string }>> {
  const trimmed = sanitizeString(body);
  if (!trimmed) {
    return { success: false, error: 'Note body cannot be empty.' };
  }
  if (trimmed.length > 5000) {
    return { success: false, error: 'Note must be 5000 characters or fewer.' };
  }

  try {
    return await withPermission('activities.create', async (ctx) => {
      const db = getTenantDb();

      const activity = await db.activity.create({
        data: {
          contactId,
          type: 'note',
          body: trimmed,
          userId: ctx.userId,
        } as ActivityUncheckedCreateInput,
      });

      revalidatePath(`/contacts/${contactId}`);
      return { success: true, data: { id: activity.id } };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create note.';
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

const TAG_MAX_LENGTH = 64;

export async function addTag(
  contactId: string,
  tag: string
): Promise<ActionResult<{ id: string; tag: string }>> {
  const cleaned = sanitizeString(tag).toLowerCase();

  if (!cleaned) {
    return { success: false, error: 'Tag cannot be empty.' };
  }
  if (cleaned.length > TAG_MAX_LENGTH) {
    return {
      success: false,
      error: `Tag must be ${TAG_MAX_LENGTH} characters or fewer.`,
    };
  }

  try {
    return await withPermission('contacts.edit', async (ctx) => {
      const db = getTenantDb();

      // upsert so duplicate tag on the same contact is a no-op
      const record = await db.contactTag.upsert({
        where: {
          tenantId_contactId_tag: {
            tenantId: ctx.tenantId,
            contactId,
            tag: cleaned,
          },
        },
        create: {
          tenantId: ctx.tenantId,
          contactId,
          tag: cleaned,
        },
        update: {},
      });

      revalidatePath(`/contacts/${contactId}`);
      return { success: true, data: { id: record.id, tag: record.tag } };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add tag.';
    return { success: false, error: message };
  }
}

export async function removeTag(
  contactId: string,
  tagId: string
): Promise<ActionResult> {
  if (!tagId) {
    return { success: false, error: 'Tag ID is required.' };
  }

  try {
    return await withPermission('contacts.edit', async (ctx) => {
      const db = getTenantDb();

      // Verify the tag belongs to this tenant + contact before deleting
      const existing = await db.contactTag.findFirst({
        where: { id: tagId, tenantId: ctx.tenantId, contactId },
      });

      if (!existing) {
        return { success: false, error: 'Tag not found.' };
      }

      await db.contactTag.delete({ where: { id: tagId } });

      revalidatePath(`/contacts/${contactId}`);
      return { success: true, data: undefined };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to remove tag.';
    return { success: false, error: message };
  }
}

export async function listTenantTags(
  query: string
): Promise<ActionResult<string[]>> {
  const cleaned = sanitizeString(query).toLowerCase();

  try {
    return await withPermission('contacts.view', async (ctx) => {
      const db = getTenantDb();

      const rows = await db.contactTag.findMany({
        where: {
          tenantId: ctx.tenantId,
          ...(cleaned ? { tag: { contains: cleaned } } : {}),
        },
        select: { tag: true },
        distinct: ['tag'],
        orderBy: { tag: 'asc' },
        take: 20,
      });

      return { success: true, data: rows.map((r) => r.tag) };
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to load tag suggestions.';
    return { success: false, error: message };
  }
}
