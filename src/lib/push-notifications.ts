import { prisma } from './prisma';

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: 'default' | null;
  badge?: number;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/**
 * Send push notifications to all registered devices for a user.
 * Uses the Expo Push API -- no API key required for sending.
 * Silently swallows errors to avoid blocking primary actions.
 */
export async function sendPushNotification(params: {
  tenantId: string;
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}) {
  try {
    const tokens = await prisma.pushToken.findMany({
      where: { tenantId: params.tenantId, userId: params.userId },
      select: { token: true },
    });

    if (tokens.length === 0) return;

    const messages: ExpoPushMessage[] = tokens.map((t) => ({
      to: t.token,
      title: params.title,
      body: params.body,
      data: params.data,
      sound: 'default',
    }));

    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });

    if (!res.ok) {
      console.error('[Push] Expo API error:', res.status);
      return;
    }

    const { data: tickets } = (await res.json()) as { data: ExpoPushTicket[] };

    // Clean up invalid tokens
    const invalidIndexes: number[] = [];
    tickets.forEach((ticket, i) => {
      if (
        ticket.status === 'error' &&
        ticket.details?.error === 'DeviceNotRegistered'
      ) {
        invalidIndexes.push(i);
      }
    });

    if (invalidIndexes.length > 0) {
      const invalidTokens = invalidIndexes.map((i) => tokens[i].token);
      await prisma.pushToken.deleteMany({
        where: { token: { in: invalidTokens } },
      });
    }
  } catch (err) {
    console.error('[Push] Failed to send:', err);
  }
}

/**
 * Send push notifications to multiple users at once.
 */
export async function sendPushToMany(
  tenantId: string,
  userIds: string[],
  params: { title: string; body: string; data?: Record<string, string> },
) {
  await Promise.allSettled(
    userIds.map((userId) =>
      sendPushNotification({ tenantId, userId, ...params }),
    ),
  );
}
