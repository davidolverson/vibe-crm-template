import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Form field types
// ─────────────────────────────────────────────────────────────────────────────

export const FIELD_TYPES = ['text', 'email', 'phone', 'select', 'textarea'] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

// ─────────────────────────────────────────────────────────────────────────────
// Admin schemas -- creating/editing forms
// ─────────────────────────────────────────────────────────────────────────────

export const FormFieldSchema = z.object({
  label: z.string().min(1, 'Label is required').max(100),
  type: z.enum(FIELD_TYPES),
  required: z.boolean().default(false),
  position: z.number().int().min(0),
  options: z.string().nullable().optional(), // JSON string for select options
});

export type FormFieldInput = z.infer<typeof FormFieldSchema>;

export const FormCreateSchema = z.object({
  name: z.string().min(1, 'Form name is required').max(200),
  fields: z.array(FormFieldSchema).min(1, 'At least one field is required'),
});

export type FormCreate = z.infer<typeof FormCreateSchema>;

export const FormUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  active: z.boolean().optional(),
  fields: z.array(FormFieldSchema).min(1).optional(),
});

export type FormUpdate = z.infer<typeof FormUpdateSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Public submission schema -- validated dynamically against form fields
// ─────────────────────────────────────────────────────────────────────────────

export const FormSubmitSchema = z.object({
  /** Dynamic key-value payload from the form */
  data: z.record(z.string(), z.string().max(5000)),
  /** Honeypot -- must be empty. Bots auto-fill hidden fields. */
  _hp: z.string().max(0, 'Invalid submission').optional(),
  /** UTM tracking */
  utmSource: z.string().max(200).optional(),
  utmMedium: z.string().max(200).optional(),
  utmCampaign: z.string().max(200).optional(),
});

export type FormSubmit = z.infer<typeof FormSubmitSchema>;
