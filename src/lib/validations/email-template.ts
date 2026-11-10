import { z } from 'zod';
import { EmailTemplateCategory } from '@/generated/prisma/enums';

// ─────────────────────────────────────────────────────────────────────────────
// Category enum as Zod schema
// ─────────────────────────────────────────────────────────────────────────────

const categoryValues = Object.values(EmailTemplateCategory) as [
  string,
  ...string[],
];
const categorySchema = z.enum(
  categoryValues as [EmailTemplateCategory, ...EmailTemplateCategory[]]
);

// ─────────────────────────────────────────────────────────────────────────────
// EmailTemplateCreateSchema
// ─────────────────────────────────────────────────────────────────────────────

export const EmailTemplateCreateSchema = z.object({
  name:     z.string().min(1, 'Template name is required').max(255),
  subject:  z.string().min(1, 'Subject is required').max(500),
  body:     z.string().min(1, 'Body is required').max(10000),
  category: categorySchema,
});

export type EmailTemplateCreate = z.infer<typeof EmailTemplateCreateSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// EmailTemplateUpdateSchema -- all fields optional
// ─────────────────────────────────────────────────────────────────────────────

export const EmailTemplateUpdateSchema = EmailTemplateCreateSchema.partial();

export type EmailTemplateUpdate = z.infer<typeof EmailTemplateUpdateSchema>;
