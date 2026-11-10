import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline stage schemas
// ─────────────────────────────────────────────────────────────────────────────

export const StageCreateSchema = z.object({
  name:       z.string().min(1, 'Stage name is required').max(100),
  color:      z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a valid hex color')
    .optional(),
  order:      z.number().int().min(0),
  pipelineId: z.string().uuid('pipelineId must be a valid UUID'),
});

export type StageCreate = z.infer<typeof StageCreateSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// ReorderStagesSchema
//
// Ordered array of PipelineStage UUIDs representing desired position sequence.
// ─────────────────────────────────────────────────────────────────────────────

export const ReorderStagesSchema = z.object({
  stageIds: z
    .array(z.string().uuid('Each stage ID must be a valid UUID'))
    .min(1, 'At least one stage ID is required'),
});

export type ReorderStages = z.infer<typeof ReorderStagesSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// MoveDealSchema -- validates drag-and-drop inputs
// ─────────────────────────────────────────────────────────────────────────────

export const MoveDealSchema = z.object({
  dealId:  z.string().uuid('dealId must be a valid UUID'),
  stageId: z.string().uuid('stageId must be a valid UUID'),
});

export type MoveDeal = z.infer<typeof MoveDealSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// CloseDealSchema -- validates deal close inputs
// ─────────────────────────────────────────────────────────────────────────────

export const CloseDealSchema = z.object({
  dealId:     z.string().uuid('dealId must be a valid UUID'),
  outcome:    z.enum(['won', 'lost']),
  lostReason: z.string().max(500).optional(),
});

export type CloseDeal = z.infer<typeof CloseDealSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Default pipeline stages -- used during tenant provisioning
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_PIPELINE_STAGES = [
  { name: 'New Lead',      position: 0 },
  { name: 'Contacted',     position: 1 },
  { name: 'Qualified',     position: 2 },
  { name: 'Proposal',      position: 3 },
  { name: 'Negotiation',   position: 4 },
  { name: 'Closed Won',    position: 5 },
  { name: 'Closed Lost',   position: 6 },
] as const;
