import { z } from 'zod';
import { ContactStatus } from '@/generated/prisma/enums';

// ─────────────────────────────────────────────────────────────────────────────
// Re-export enum values as a Zod enum for schema use
// ─────────────────────────────────────────────────────────────────────────────

const contactStatusValues = Object.values(ContactStatus) as [
  string,
  ...string[],
];
const contactStatusSchema = z.enum(contactStatusValues as [ContactStatus, ...ContactStatus[]]);

// ─────────────────────────────────────────────────────────────────────────────
// ContactCreateSchema
// ─────────────────────────────────────────────────────────────────────────────

export const ContactCreateSchema = z.object({
  name:    z.string().min(1, 'Name is required').max(255),
  email:   z.email('Must be a valid email address').optional().or(z.literal('')).transform(v => v === '' ? undefined : v),
  phone:   z.string().max(50).optional(),
  company: z.string().max(255).optional(),
  status:  contactStatusSchema.default(ContactStatus.new),
  source:  z.string().max(100).optional(),
  assignedToUserId: z.string().uuid().optional(),
});

export type ContactCreate = z.infer<typeof ContactCreateSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// ContactUpdateSchema -- all fields optional except we still validate formats
// ─────────────────────────────────────────────────────────────────────────────

export const ContactUpdateSchema = ContactCreateSchema.partial();

export type ContactUpdate = z.infer<typeof ContactUpdateSchema>;
