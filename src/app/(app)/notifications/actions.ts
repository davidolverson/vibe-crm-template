'use server';

import { revalidatePath } from 'next/cache';
import { getAuthContext } from '@/lib/auth';
import { getTenantDb } from '@/lib/prisma-tenant';
import { withTenantContext } from '@/lib/tenant-context';
import type { NotificationType } from '@/generated/prisma/enums';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  readAt: Date | null;
  createdAt: Date;
  referenceType: string | null;
  referenceId: string | null;
}

export interface GetNotificationsResult {
  notifications: NotificationItem[];
  unreadCount: number;
}

type ActionResult = { success: boolean; error?: string };

/**
 * Fetch the 10 most recent in-app notifications for the current user,
 * plus their total unread count. No permission gate needed -- users
 * always have access to their own notifications.
 */
export async function getNotifications(): Promise<GetNotificationsResult> {
  const ctx = await getAuthContext();

  return withTenantContext(ctx.tenantId, ctx.userId, async () => {
    const db = getTenantDb();

    const [notifications, unreadCount] = await Promise.all([
      db.notification.findMany({
        where: {
          userId: ctx.userId,
          channel: { in: ['in_app', 'both'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          readAt: true,
          createdAt: true,
          referenceType: true,
          referenceId: true,
        },
      }),
      db.notification.count({
        where: {
          userId: ctx.userId,
          readAt: null,
          channel: { in: ['in_app', 'both'] },
        },
      }),
    ]);

    return {
      notifications: notifications as NotificationItem[],
      unreadCount,
    };
  });
}

/**
 * Return just the unread count -- useful for lightweight polling-free checks.
 */
export async function getUnreadCount(): Promise<number> {
  const ctx = await getAuthContext();

  return withTenantContext(ctx.tenantId, ctx.userId, async () => {
    const db = getTenantDb();
    return db.notification.count({
      where: {
        userId: ctx.userId,
        readAt: null,
        channel: { in: ['in_app', 'both'] },
      },
    });
  });
}

/**
 * Mark a single notification as read by ID.
 * Only marks it if it belongs to the current user (userId guard).
 */
export async function markAsRead(notificationId: string): Promise<ActionResult> {
  if (!notificationId) {
    return { success: false, error: 'Notification ID required' };
  }

  try {
    const ctx = await getAuthContext();

    await withTenantContext(ctx.tenantId, ctx.userId, async () => {
      const db = getTenantDb();
      // findFirst respects tenant scope from getTenantDb; userId check is explicit
      const notification = await db.notification.findFirst({
        where: { id: notificationId, userId: ctx.userId },
        select: { id: true, readAt: true },
      });

      if (!notification) return; // silently ignore -- not found or wrong tenant/user
      if (notification.readAt) return; // already read

      await db.notification.update({
        where: { id: notificationId },
        data: { readAt: new Date() },
      });
    });

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to mark notification as read';
    return { success: false, error: message };
  }
}

/**
 * Mark every unread in-app notification as read for the current user.
 */
export async function markAllAsRead(): Promise<ActionResult> {
  try {
    const ctx = await getAuthContext();

    await withTenantContext(ctx.tenantId, ctx.userId, async () => {
      // Use raw prisma here -- updateMany doesn't go through the tenant extension's
      // query interceptor for writes, so we add tenantId + userId explicitly.
      const { prisma } = await import('@/lib/prisma');
      await prisma.notification.updateMany({
        where: {
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          readAt: null,
          channel: { in: ['in_app', 'both'] },
        },
        data: { readAt: new Date() },
      });
    });

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to mark all as read';
    return { success: false, error: message };
  }
}
