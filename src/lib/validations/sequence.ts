import { z } from 'zod';

export const sequenceCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
});

export const sequenceStepCreateSchema = z.object({
  sequenceId: z.string().uuid(),
  type: z.enum(['email', 'sms', 'wait']),
  templateId: z.string().uuid().optional().nullable(),
  smsBody: z.string().max(1600).optional().nullable(),
  delayDays: z.number().int().min(0).max(365).default(0),
  delayHours: z.number().int().min(0).max(23).default(0),
});

export const enrollContactSchema = z.object({
  sequenceId: z.string().uuid(),
  contactId: z.string().uuid(),
});

export type SequenceCreateInput = z.infer<typeof sequenceCreateSchema>;
export type SequenceStepCreateInput = z.infer<typeof sequenceStepCreateSchema>;
export type EnrollContactInput = z.infer<typeof enrollContactSchema>;
