import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// DealCreateSchema
// stageId references a PipelineStage row; contactId references Contact row.
// value is stored as Decimal(12,2) in DB -- we accept a number and let Prisma
// coerce it.  expectedCloseDate comes in as an ISO-8601 string from the client.
// ─────────────────────────────────────────────────────────────────────────────

export const DealCreateSchema = z.object({
  title:             z.string().min(1, 'Title is required').max(255),
  value:             z.number().nonnegative('Value must be 0 or greater').optional(),
  contactId:         z.string().uuid('contactId must be a valid UUID'),
  stageId:           z.string().uuid('stageId must be a valid UUID'),
  expectedCloseDate: z.iso.date().optional(),
  assignedToUserId:  z.string().uuid().optional(),
  lostReason:        z.string().max(500).optional(),
});

export type DealCreate = z.infer<typeof DealCreateSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// DealUpdateSchema -- all fields optional
// ─────────────────────────────────────────────────────────────────────────────

export const DealUpdateSchema = DealCreateSchema.partial();

export type DealUpdate = z.infer<typeof DealUpdateSchema>;
