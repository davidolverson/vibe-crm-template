import { z } from 'zod';
import { AssignmentRuleType } from '@/generated/prisma/enums';

// ─────────────────────────────────────────────────────────────────────────────
// Config schemas for each rule type
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Round-robin config: list of user IDs to rotate through.
 * { userIds: ["uuid1", "uuid2", ...], active: true }
 */
export const RoundRobinConfigSchema = z.object({
  userIds: z
    .array(z.string().uuid('Each member must be a valid UUID'))
    .min(1, 'At least one team member is required'),
  active: z.boolean().default(true),
});

export type RoundRobinConfig = z.infer<typeof RoundRobinConfigSchema>;

/**
 * Default-owner config: a single user ID all leads go to.
 * { userId: "uuid", active: true }
 */
export const DefaultOwnerConfigSchema = z.object({
  userId: z.string().uuid('Must be a valid UUID'),
  active: z.boolean().default(true),
});

export type DefaultOwnerConfig = z.infer<typeof DefaultOwnerConfigSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Assignment rule type enum as Zod
// ─────────────────────────────────────────────────────────────────────────────

const assignmentRuleTypeValues = Object.values(AssignmentRuleType) as [
  string,
  ...string[],
];
const assignmentRuleTypeSchema = z.enum(
  assignmentRuleTypeValues as [AssignmentRuleType, ...AssignmentRuleType[]]
);

// ─────────────────────────────────────────────────────────────────────────────
// Create / Update schemas
// ─────────────────────────────────────────────────────────────────────────────

export const AssignmentRuleCreateSchema = z
  .object({
    type: assignmentRuleTypeSchema,
    configJson: z.unknown(),
  })
  .superRefine((val, ctx) => {
    if (val.type === AssignmentRuleType.round_robin) {
      const result = RoundRobinConfigSchema.safeParse(val.configJson);
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          ctx.addIssue({ ...issue, path: ['configJson', ...issue.path] });
        });
      }
    } else if (val.type === AssignmentRuleType.default_owner) {
      const result = DefaultOwnerConfigSchema.safeParse(val.configJson);
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          ctx.addIssue({ ...issue, path: ['configJson', ...issue.path] });
        });
      }
    }
  });

export type AssignmentRuleCreate = z.infer<typeof AssignmentRuleCreateSchema>;

export const AssignmentRuleUpdateSchema = z.object({
  configJson: z.unknown(),
});

export type AssignmentRuleUpdate = z.infer<typeof AssignmentRuleUpdateSchema>;

export const AssignmentRuleToggleSchema = z.object({
  active: z.boolean(),
});

export type AssignmentRuleToggle = z.infer<typeof AssignmentRuleToggleSchema>;
