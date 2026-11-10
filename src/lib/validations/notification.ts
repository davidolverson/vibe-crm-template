import { z } from 'zod';
import { NotificationType } from '@/generated/prisma/enums';

// ─────────────────────────────────────────────────────────────────────────────
// Notification schemas
// ─────────────────────────────────────────────────────────────────────────────

const notificationTypeValues = Object.values(NotificationType) as [
  string,
  ...string[],
];

export const CreateNotificationSchema = z.object({
  userId: z.string().min(1),
  type: z.enum(
    notificationTypeValues as [NotificationType, ...NotificationType[]]
  ),
  title: z.string().min(1).max(200),
  body: z.string().max(1000).optional(),
  referenceType: z.string().max(50).optional(),
  referenceId: z.string().uuid().optional(),
});

export type CreateNotification = z.infer<typeof CreateNotificationSchema>;
