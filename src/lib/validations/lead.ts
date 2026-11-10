import { z } from 'zod';
import { uuidSchema, phoneSchema } from './common';

// ─────────────────────────────────────────────────────────────────────────────
// Lead source enum -- mirrors DB enum; centralised here for form + validation
// ─────────────────────────────────────────────────────────────────────────────

export const LEAD_SOURCES = ['website', 'referral', 'social', 'ad', 'other'] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

// ─────────────────────────────────────────────────────────────────────────────
// Lead status enum -- pipeline stages for a raw lead (pre-contact)
// ─────────────────────────────────────────────────────────────────────────────

export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'converted', 'lost'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

// ─────────────────────────────────────────────────────────────────────────────
// LeadFormCreateSchema
// ─────────────────────────────────────────────────────────────────────────────

export const LeadFormCreateSchema = z.object({
  // Core identity
  name:  z.string().min(1, 'Name is required').max(255),
  email: z
    .email('Must be a valid email address')
    .optional()
    .or(z.literal(''))
    .transform((v) => (v === '' ? undefined : v)),
  phone: phoneSchema.optional().or(z.literal('')).transform((v) => (v === '' ? undefined : v)),

  // Lead metadata
  source:           z.enum(LEAD_SOURCES).default('other'),
  status:           z.enum(LEAD_STATUSES).default('new'),
  propertyInterest: z.string().max(500).optional(),

  // Budget -- stored as min/max cents to avoid float precision issues
  budgetMin: z.coerce.number().int().min(0).optional(),
  budgetMax: z.coerce.number().int().min(0).optional(),

  // Free-text notes
  notes: z.string().max(5000).optional(),

  // Assignment
  assignedTo: uuidSchema.optional(),
});

export type LeadFormCreate = z.infer<typeof LeadFormCreateSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// LeadFormUpdateSchema -- all fields optional, same format rules apply
// ─────────────────────────────────────────────────────────────────────────────

export const LeadFormUpdateSchema = LeadFormCreateSchema.partial();

export type LeadFormUpdate = z.infer<typeof LeadFormUpdateSchema>;
