import { z } from 'zod';
import { TaskStatus } from '@/generated/prisma/enums';

// ─────────────────────────────────────────────────────────────────────────────
// Priority enum -- not in the Prisma schema yet (Task model has no priority col),
// so we define it locally here for form validation.  Add the DB column in V1.
// ─────────────────────────────────────────────────────────────────────────────

export const TaskPriority = {
  low:    'low',
  medium: 'medium',
  high:   'high',
  urgent: 'urgent',
} as const;

export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];

const taskPriorityValues = Object.values(TaskPriority) as [string, ...string[]];
const taskPrioritySchema = z.enum(taskPriorityValues as [TaskPriority, ...TaskPriority[]]);

// ─────────────────────────────────────────────────────────────────────────────
// TaskStatus from Prisma generated enums
// ─────────────────────────────────────────────────────────────────────────────

const taskStatusValues = Object.values(TaskStatus) as [string, ...string[]];
const taskStatusSchema = z.enum(taskStatusValues as [TaskStatus, ...TaskStatus[]]);

// ─────────────────────────────────────────────────────────────────────────────
// TaskCreateSchema
// ─────────────────────────────────────────────────────────────────────────────

export const TaskCreateSchema = z.object({
  title:       z.string().min(1, 'Title is required').max(255),
  description: z.string().max(2000).optional(),
  contactId:   z.string().uuid('contactId must be a valid UUID').optional(),
  assigneeId:  z.string().uuid('assigneeId must be a valid UUID').optional(),
  dueDate:     z.iso.date().optional(),
  priority:    taskPrioritySchema.default(TaskPriority.medium),
  status:      taskStatusSchema.default(TaskStatus.pending),
});

export type TaskCreate = z.infer<typeof TaskCreateSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// TaskUpdateSchema -- all fields optional
// ─────────────────────────────────────────────────────────────────────────────

export const TaskUpdateSchema = TaskCreateSchema.partial();

export type TaskUpdate = z.infer<typeof TaskUpdateSchema>;
