/**
 * Contact deduplication helpers.
 *
 * findDuplicateContact checks for an existing (non-deleted) contact
 * that matches on email first, then phone. Returns the first match
 * found or null. The caller decides what to do -- merge, reject, or
 * surface a warning.
 */

import { getTenantDb } from './prisma-tenant';

type TenantDb = ReturnType<typeof getTenantDb>;

export interface DuplicateContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  matchedOn: 'email' | 'phone';
}

/**
 * Check for a duplicate contact within the current tenant scope.
 *
 * Must be called inside a withPermission / withTenantContext block so
 * getTenantContext() resolves correctly.
 *
 * @param db      - Tenant-scoped Prisma client from getTenantDb()
 * @param email   - Email to check (optional)
 * @param phone   - Phone to check (optional)
 * @returns       Matching contact with matchedOn field, or null
 */
export async function findDuplicateContact(
  db: TenantDb,
  email?: string | null,
  phone?: string | null
): Promise<DuplicateContact | null> {
  // Email takes priority -- most reliable unique identifier
  if (email) {
    const byEmail = await db.contact.findFirst({
      where: {
        email,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
      },
    });

    if (byEmail) {
      return { ...byEmail, matchedOn: 'email' };
    }
  }

  // Fall back to phone match
  if (phone) {
    const byPhone = await db.contact.findFirst({
      where: {
        phone,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
      },
    });

    if (byPhone) {
      return { ...byPhone, matchedOn: 'phone' };
    }
  }

  return null;
}
