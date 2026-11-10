'use server';

import { revalidatePath } from 'next/cache';
import { withPermission } from '@/lib/permissions';
import { getTenantDb } from '@/lib/prisma-tenant';
import { sanitizeString } from '@/lib/sanitize';
import { DEFAULT_FORM_FIELDS } from '@/lib/rbac-definitions';
import { checkPlanLimitSoft } from '@/lib/plan-enforcement';

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function createForm(
  name: string
): Promise<ActionResult<{ id: string }>> {
  const trimmed = sanitizeString(name);
  if (!trimmed) {
    return { success: false, error: 'Form name is required.' };
  }
  if (trimmed.length > 120) {
    return { success: false, error: 'Form name must be 120 characters or less.' };
  }

  try {
    return await withPermission('forms.create', async (ctx) => {
      const limitError = await checkPlanLimitSoft(ctx.tenantId, 'forms');
      if (limitError) {
        return { success: false, error: limitError };
      }

      const db = getTenantDb();

      const form = await db.form.create({
        data: {
          tenantId: ctx.tenantId,
          name: trimmed,
          active: true,
          fields: {
            create: DEFAULT_FORM_FIELDS.map((field) => ({
              label: field.label,
              type: field.type,
              required: field.required,
              position: field.position,
              tenantId: ctx.tenantId,
            })),
          },
        },
        select: { id: true },
      });

      revalidatePath('/forms');
      return { success: true, data: { id: form.id } };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create form';
    return { success: false, error: message };
  }
}

export async function setFormDefaultSequence(
  formId: string,
  sequenceId: string | null
): Promise<ActionResult<undefined>> {
  if (!formId) return { success: false, error: 'Form ID is required.' };

  try {
    return await withPermission('forms.edit', async () => {
      const db = getTenantDb();

      const existing = await db.form.findUnique({ where: { id: formId }, select: { id: true } });
      if (!existing) return { success: false, error: 'Form not found.' };

      if (sequenceId) {
        const seq = await db.sequence.findUnique({
          where: { id: sequenceId },
          select: { id: true },
        });
        if (!seq) return { success: false, error: 'Sequence not found or not in this workspace.' };
      }

      await db.form.update({
        where: { id: formId },
        data: { defaultSequenceId: sequenceId },
      });

      revalidatePath(`/forms/${formId}`);
      return { success: true, data: undefined };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update form.';
    return { success: false, error: message };
  }
}

export async function deleteForm(
  id: string
): Promise<ActionResult<undefined>> {
  if (!id) {
    return { success: false, error: 'Form ID is required.' };
  }

  try {
    return await withPermission('forms.delete', async () => {
      const db = getTenantDb();

      // Verify the form belongs to this tenant before deleting
      const existing = await db.form.findUnique({ where: { id }, select: { id: true } });
      if (!existing) {
        return { success: false, error: 'Form not found.' };
      }

      await db.form.delete({ where: { id } });

      revalidatePath('/forms');
      return { success: true, data: undefined };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete form';
    return { success: false, error: message };
  }
}

export interface SubmissionRow {
  id: string;
  payloadJson: Record<string, unknown>;
  ipAddress: string | null;
  contactId: string | null;
  createdAt: string;
}

export async function getFormSubmissions(
  formId: string
): Promise<ActionResult<SubmissionRow[]>> {
  if (!formId) {
    return { success: false, error: 'Form ID is required.' };
  }

  try {
    return await withPermission('forms.view', async () => {
      const db = getTenantDb();

      // Confirm the form belongs to this tenant
      const form = await db.form.findUnique({
        where: { id: formId },
        select: { id: true },
      });

      if (!form) {
        return { success: false, error: 'Form not found.' };
      }

      const rows = await db.formSubmission.findMany({
        where: { formId },
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: {
          id: true,
          payloadJson: true,
          ipAddress: true,
          contactId: true,
          createdAt: true,
        },
      });

      const data: SubmissionRow[] = rows.map((r) => ({
        id: r.id,
        payloadJson: r.payloadJson as Record<string, unknown>,
        ipAddress: r.ipAddress ?? null,
        contactId: r.contactId ?? null,
        createdAt: r.createdAt.toISOString(),
      }));

      return { success: true, data };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load submissions';
    return { success: false, error: message };
  }
}
