import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// UUID
// ─────────────────────────────────────────────────────────────────────────────

export const uuidSchema = z.string().uuid('Must be a valid UUID');

export type UUID = z.infer<typeof uuidSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Phone -- US format (normalised to E.164-ish: +1XXXXXXXXXX)
// Accepts: (555) 123-4567 | 555-123-4567 | 5551234567 | +15551234567
// ─────────────────────────────────────────────────────────────────────────────

export const phoneSchema = z
  .string()
  .transform((val) => val.replace(/\D/g, ''))           // strip non-digits
  .refine(
    (digits) =>
      digits.length === 10 || (digits.length === 11 && digits.startsWith('1')),
    { message: 'Must be a valid US phone number' }
  )
  .transform((digits) =>
    digits.length === 11 ? `+${digits}` : `+1${digits}`
  );

export type Phone = z.infer<typeof phoneSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Pagination
// ─────────────────────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page:      z.coerce.number().int().min(1).default(1),
  pageSize:  z.coerce.number().int().min(1).max(100).default(25),
  sortBy:    z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type Pagination = z.infer<typeof paginationSchema>;
