/**
 * Webhook event deduplication.
 *
 * Stripe, Postmark, and Twilio can all retry webhooks on timeout or
 * network errors.  Without dedup, retries cause double-processing
 * (double charges, double opt-outs, duplicate SMS records, etc.).
 *
 * Uses the WebhookEvent table with a unique constraint on
 * (provider, externalId) to guarantee at-most-once processing.
 */

import { prisma } from './prisma';

/**
 * Check whether a webhook event has already been processed.
 *
 * @param provider   - Source system: stripe | postmark | twilio | social | clerk
 * @param externalId - The provider's unique event/message ID
 * @returns true if the event was already recorded (skip processing)
 */
export async function isProcessed(
  provider: string,
  externalId: string,
): Promise<boolean> {
  const existing = await prisma.webhookEvent.findUnique({
    where: { provider_externalId: { provider, externalId } },
    select: { id: true },
  });
  return existing !== null;
}

/**
 * Record a webhook event as processed.
 *
 * Uses upsert so concurrent retries hitting at the same instant
 * don't throw a unique-constraint error.
 *
 * @param provider   - Source system
 * @param externalId - The provider's unique event/message ID
 * @param eventType  - The event type string (e.g. "invoice.paid")
 */
export async function markProcessed(
  provider: string,
  externalId: string,
  eventType: string = 'unknown',
): Promise<void> {
  await prisma.webhookEvent.upsert({
    where: { provider_externalId: { provider, externalId } },
    create: {
      provider,
      externalId,
      eventType,
      payload: {},
      status: 'processed',
      attempts: 1,
      processedAt: new Date(),
    },
    update: {
      status: 'processed',
      attempts: { increment: 1 },
      processedAt: new Date(),
    },
  });
}

/**
 * Delete webhook events older than the specified number of days.
 *
 * Keeps the table from growing unbounded. Safe to run on a cron
 * (e.g. daily via Mission Control).
 *
 * @param daysToKeep - Events older than this are purged (default 30)
 * @returns Number of rows deleted
 */
export async function cleanupOldEvents(
  daysToKeep: number = 30,
): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysToKeep);

  const result = await prisma.webhookEvent.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  return result.count;
}
