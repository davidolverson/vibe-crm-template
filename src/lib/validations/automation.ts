import { z } from 'zod';

export const automationCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  triggerType: z.enum([
    'form_submitted',
    'deal_stage_changed',
    'lead_not_contacted',
    'contact_created',
  ]),
  conditionsJson: z
    .object({
      source: z.string().optional(),
      pipelineId: z.string().uuid().optional(),
      stageId: z.string().uuid().optional(),
      thresholdMinutes: z.number().int().min(1).optional(),
    })
    .optional()
    .nullable(),
  actionsJson: z.array(
    z.object({
      type: z.enum(['create_task', 'send_email', 'notify_user', 'enroll_in_sequence']),
      templateId: z.string().uuid().optional(),
      sequenceId: z.string().uuid().optional(),
      userId: z.string().optional(),
      taskTitle: z.string().optional(),
    })
  ).min(1, 'At least one action is required'),
});

export type AutomationCreateInput = z.infer<typeof automationCreateSchema>;
