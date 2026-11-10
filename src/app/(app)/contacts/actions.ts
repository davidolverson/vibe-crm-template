'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { withPermission } from '@/lib/permissions';
import { getTenantDb } from '@/lib/prisma-tenant';
import { sanitizeString } from '@/lib/sanitize';
import {
  ContactCreateSchema,
  ContactUpdateSchema,
} from '@/lib/validations/contact';
import { ContactStatus } from '@/generated/prisma/enums';
import type { ContactUncheckedCreateInput } from '@/generated/prisma/models/Contact';
import { createNotification } from '@/lib/notifications';
import { checkPlanLimitSoft } from '@/lib/plan-enforcement';

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

function formDataToObject(formData: FormData): Record<string, string> {
  const obj: Record<string, string> = {};
  formData.forEach((value, key) => {
    if (typeof value === 'string' && value.trim() !== '') {
      obj[key] = sanitizeString(value);
    }
  });
  return obj;
}

export async function createContact(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    return await withPermission('contacts.create', async (ctx) => {
      const limitError = await checkPlanLimitSoft(ctx.tenantId, 'contacts');
      if (limitError) {
        return { success: false, error: limitError };
      }

      const raw = formDataToObject(formData);
      const parsed = ContactCreateSchema.safeParse(raw);

      if (!parsed.success) {
        return {
          success: false,
          error: parsed.error.issues[0]?.message ?? 'Validation failed',
        };
      }

      const db = getTenantDb();
      // tenantId is injected by the tenant middleware at runtime
      const contact = await db.contact.create({
        data: parsed.data as ContactUncheckedCreateInput,
      });

      void createNotification(ctx.userId, ctx.tenantId, 'contact_added', `New contact: ${parsed.data.name}`, `/contacts/${contact.id}`);

      revalidatePath('/contacts');
      return { success: true, data: { id: contact.id } };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create contact';
    return { success: false, error: message };
  }
}

export async function updateContact(
  id: string,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  try {
    return await withPermission('contacts.edit', async () => {
      const raw = formDataToObject(formData);
      const parsed = ContactUpdateSchema.safeParse(raw);

      if (!parsed.success) {
        return {
          success: false,
          error: parsed.error.issues[0]?.message ?? 'Validation failed',
        };
      }

      const db = getTenantDb();
      const contact = await db.contact.update({
        where: { id },
        data: parsed.data,
      });

      revalidatePath('/contacts');
      revalidatePath(`/contacts/${id}`);
      return { success: true, data: { id: contact.id } };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update contact';
    return { success: false, error: message };
  }
}

export async function deleteContact(
  id: string
): Promise<ActionResult<undefined>> {
  try {
    return await withPermission('contacts.delete', async () => {
      const db = getTenantDb();
      await db.contact.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      revalidatePath('/contacts');
      return { success: true, data: undefined };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete contact';
    return { success: false, error: message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV Export
// ─────────────────────────────────────────────────────────────────────────────

export interface ExportContactRow {
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: string;
  source: string | null;
  createdAt: string;
}

const MAX_EXPORT = 5000;

export async function exportContacts(): Promise<ActionResult<ExportContactRow[]>> {
  try {
    return await withPermission('contacts.view', async () => {
      const db = getTenantDb();

      const contacts = await db.contact.findMany({
        where: { deletedAt: null },
        select: {
          name: true,
          email: true,
          phone: true,
          company: true,
          status: true,
          source: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: MAX_EXPORT,
      });

      const rows: ExportContactRow[] = contacts.map((c) => ({
        name: c.name,
        email: c.email ?? null,
        phone: c.phone ?? null,
        company: c.company ?? null,
        status: c.status,
        source: c.source ?? null,
        createdAt: c.createdAt.toISOString(),
      }));

      return { success: true, data: rows };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to export contacts';
    return { success: false, error: message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Bulk actions
// ─────────────────────────────────────────────────────────────────────────────

const MAX_BULK = 500;

const BulkIdsSchema = z
  .array(z.string().cuid())
  .min(1, 'At least one contact ID is required.')
  .max(MAX_BULK, `Cannot bulk-act on more than ${MAX_BULK} contacts at once.`);

export async function bulkUpdateStatus(
  contactIds: string[],
  status: string
): Promise<ActionResult<{ updated: number }>> {
  try {
    return await withPermission('contacts.edit', async () => {
      const idsParsed = BulkIdsSchema.safeParse(contactIds);
      if (!idsParsed.success) {
        return {
          success: false,
          error: idsParsed.error.issues[0]?.message ?? 'Invalid IDs.',
        };
      }

      const statusParsed = z
        .enum(Object.values(ContactStatus) as [string, ...string[]])
        .safeParse(status);
      if (!statusParsed.success) {
        return { success: false, error: 'Invalid status value.' };
      }

      const db = getTenantDb();
      const result = await db.contact.updateMany({
        where: { id: { in: idsParsed.data }, deletedAt: null },
        data: { status: statusParsed.data as ContactStatus },
      });

      revalidatePath('/contacts');
      return { success: true, data: { updated: result.count } };
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Bulk status update failed';
    return { success: false, error: message };
  }
}

export async function bulkDeleteContacts(
  contactIds: string[]
): Promise<ActionResult<{ deleted: number }>> {
  try {
    return await withPermission('contacts.delete', async () => {
      const idsParsed = BulkIdsSchema.safeParse(contactIds);
      if (!idsParsed.success) {
        return {
          success: false,
          error: idsParsed.error.issues[0]?.message ?? 'Invalid IDs.',
        };
      }

      const db = getTenantDb();
      const result = await db.contact.updateMany({
        where: { id: { in: idsParsed.data }, deletedAt: null },
        data: { deletedAt: new Date() },
      });

      revalidatePath('/contacts');
      return { success: true, data: { deleted: result.count } };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bulk delete failed';
    return { success: false, error: message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV Import
// ─────────────────────────────────────────────────────────────────────────────

export interface CsvContactRow {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  status?: string;
}

export interface BulkImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

const MAX_IMPORT = 500;

// Row-level schema: mirrors ContactCreateSchema but all fields optional except
// name, so we can produce row-specific error messages.
const CsvRowSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z
    .string()
    .email('Invalid email')
    .optional()
    .or(z.literal(''))
    .transform((v) => (v === '' ? undefined : v)),
  phone: z.string().max(50).optional(),
  company: z.string().max(255).optional(),
  status: z
    .enum(Object.values(ContactStatus) as [string, ...string[]])
    .optional()
    .default(ContactStatus.new),
});

export async function bulkCreateContacts(
  rows: CsvContactRow[]
): Promise<ActionResult<BulkImportResult>> {
  try {
    return await withPermission('contacts.create', async (ctx) => {
      if (rows.length === 0) {
        return {
          success: false,
          error: 'No rows provided.',
        };
      }

      if (rows.length > MAX_IMPORT) {
        return {
          success: false,
          error: `Maximum ${MAX_IMPORT} contacts per import. Received ${rows.length}.`,
        };
      }

      // Plan limit: check whether this batch would push the tenant over their cap.
      // Pass rows.length as the optimistic "adding" count so the error shows the
      // exact remaining capacity even before row-level dedup runs.
      const limitError = await checkPlanLimitSoft(ctx.tenantId, 'contacts', rows.length);
      if (limitError) {
        return { success: false, error: limitError };
      }

      const db = getTenantDb();
      const errors: string[] = [];
      const validRows: z.infer<typeof CsvRowSchema>[] = [];

      // Validate each row
      for (let i = 0; i < rows.length; i++) {
        const raw = rows[i];

        // Sanitize all string fields before validation
        const sanitized: CsvContactRow = {
          name: sanitizeString(raw.name ?? ''),
          email: raw.email ? sanitizeString(raw.email) : undefined,
          phone: raw.phone ? sanitizeString(raw.phone) : undefined,
          company: raw.company ? sanitizeString(raw.company) : undefined,
          status: raw.status ? sanitizeString(raw.status) : undefined,
        };

        const parsed = CsvRowSchema.safeParse(sanitized);

        if (!parsed.success) {
          const msg = parsed.error.issues[0]?.message ?? 'Validation failed';
          errors.push(`Row ${i + 2}: ${msg}`); // +2 because row 1 is the header
          continue;
        }

        validRows.push(parsed.data);
      }

      if (validRows.length === 0) {
        return {
          success: true,
          data: { imported: 0, skipped: 0, errors },
        };
      }

      // Split rows into those with emails (dedup by email) and those without.
      const rowsWithEmailRaw = validRows.filter((r) => r.email);
      const rowsNoEmail = validRows.filter((r) => !r.email);

      // Dedup within the same upload: if "alice@example.com" appears twice in the
      // file, only the first row is kept.
      const seenInFile = new Set<string>();
      const rowsWithEmail = rowsWithEmailRaw.filter((r) => {
        const key = r.email!.toLowerCase();
        if (seenInFile.has(key)) return false;
        seenInFile.add(key);
        return true;
      });

      let imported = 0;
      let skipped = rowsWithEmailRaw.length - rowsWithEmail.length;

      // Single batched query to find which emails already exist -- turns N
      // round-trips into 1 for the 500-row import path.
      const existingEmails = rowsWithEmail.length
        ? new Set(
            (
              await db.contact.findMany({
                where: { email: { in: rowsWithEmail.map((r) => r.email!) }, deletedAt: null },
                select: { email: true },
              })
            )
              .map((c) => c.email?.toLowerCase())
              .filter(Boolean) as string[]
          )
        : new Set<string>();

      const toInsertWithEmail = rowsWithEmail.filter((r) => {
        if (existingEmails.has(r.email!.toLowerCase())) {
          skipped++;
          return false;
        }
        return true;
      });

      if (toInsertWithEmail.length > 0) {
        try {
          const result = await db.contact.createMany({
            data: toInsertWithEmail as ContactUncheckedCreateInput[],
            skipDuplicates: true,
          });
          imported += result.count;
        } catch {
          errors.push(`Failed to import ${toInsertWithEmail.length} contact(s) with email.`);
        }
      }

      // Rows without emails are always created (no dedup key available)
      if (rowsNoEmail.length > 0) {
        try {
          const result = await db.contact.createMany({
            data: rowsNoEmail as ContactUncheckedCreateInput[],
            skipDuplicates: false,
          });
          imported += result.count;
        } catch {
          errors.push(
            `Failed to import ${rowsNoEmail.length} contact(s) without email.`
          );
        }
      }

      revalidatePath('/contacts');

      return {
        success: true,
        data: { imported, skipped, errors },
      };
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Bulk import failed';
    return { success: false, error: message };
  }
}
