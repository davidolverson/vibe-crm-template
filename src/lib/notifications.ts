import { prisma } from './prisma';
import type { NotificationType, NotificationChannel } from '@/generated/prisma/enums';
import { sendPushNotification, sendPushToMany } from './push-notifications';

/**
 * Create an in-app notification for a specific user.
 * Also sends a push notification to any registered mobile devices.
 *
 * Silently swallows errors -- notification failure should never
 * block the primary action.
 */
export async function notify(params: {
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  channel?: NotificationChannel;
  referenceType?: string;
  referenceId?: string;
}) {
  try {
    await prisma.notification.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body ?? null,
        channel: params.channel ?? 'in_app',
        referenceType: params.referenceType ?? null,
        referenceId: params.referenceId ?? null,
      },
    });

    // Fire-and-forget push notification to mobile devices
    sendPushNotification({
      tenantId: params.tenantId,
      userId: params.userId,
      title: params.title,
      body: params.body ?? '',
      data: {
        type: params.type,
        ...(params.referenceType ? { referenceType: params.referenceType } : {}),
        ...(params.referenceId ? { referenceId: params.referenceId } : {}),
      },
    });
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}

/**
 * Create notifications for multiple users at once.
 */
export async function notifyMany(
  tenantId: string,
  userIds: string[],
  params: {
    type: NotificationType;
    title: string;
    body?: string;
    referenceType?: string;
    referenceId?: string;
  }
) {
  try {
    await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        tenantId,
        userId,
        type: params.type,
        title: params.title,
        body: params.body ?? null,
        channel: 'in_app' as NotificationChannel,
        referenceType: params.referenceType ?? null,
        referenceId: params.referenceId ?? null,
      })),
    });

    // Fire-and-forget push to all users
    sendPushToMany(tenantId, userIds, {
      title: params.title,
      body: params.body ?? '',
      data: {
        type: params.type,
        ...(params.referenceType ? { referenceType: params.referenceType } : {}),
        ...(params.referenceId ? { referenceId: params.referenceId } : {}),
      },
    });
  } catch (err) {
    console.error('Failed to create notifications:', err);
  }
}

// ---------------------------------------------------------------------------
// Typed helper for common CRM notification events
// ---------------------------------------------------------------------------

export type CrmNotificationType =
  | 'task_due'
  | 'deal_moved'
  | 'contact_added'
  | 'form_submission';

const CRM_TYPE_MAP: Record<CrmNotificationType, NotificationType> = {
  task_due: 'task_due_soon',
  deal_moved: 'deal_stage_changed',
  contact_added: 'lead_assigned',
  form_submission: 'automation_fired',
};

const CRM_TYPE_TITLES: Record<CrmNotificationType, string> = {
  task_due: 'Task due soon',
  deal_moved: 'Deal stage changed',
  contact_added: 'New contact added',
  form_submission: 'New form submission',
};

/**
 * Convenience wrapper called from other server actions.
 *
 * Usage:
 *   await createNotification(userId, tenantId, 'task_due', 'Follow up with Alice', '/tasks/123');
 *
 * The optional `link` is stored as referenceType='link' + referenceId=url so
 * the bell component can render a navigable item without a separate column.
 */
export async function createNotification(
  userId: string,
  tenantId: string,
  type: CrmNotificationType,
  message: string,
  link?: string
): Promise<void> {
  await notify({
    userId,
    tenantId,
    type: CRM_TYPE_MAP[type],
    title: CRM_TYPE_TITLES[type],
    body: message,
    channel: 'in_app',
    ...(link ? { referenceType: 'link', referenceId: link } : {}),
  });
}
