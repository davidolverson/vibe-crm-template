export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireCronAuth } from '@/lib/cron-auth';
import { prisma } from '@/lib/prisma';
import { syncQboData } from '@/lib/qbo';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const unauthorized = requireCronAuth(req);
  if (unauthorized) return unauthorized;

  const startedAt = Date.now();

  // Recover connections stuck in `syncing` for more than 30 minutes. A crashed
  // previous run would otherwise leave the tenant permanently unable to sync.
  const staleCutoff = new Date(Date.now() - 30 * 60_000);
  const recovered = await prisma.qboConnection.updateMany({
    where: {
      syncStatus: 'syncing',
      updatedAt: { lt: staleCutoff },
    },
    data: { syncStatus: 'error' },
  });

  const connections = await prisma.qboConnection.findMany({
    where: { syncStatus: { in: ['idle', 'error'] } },
    select: { tenantId: true },
  });

  const results = {
    tenantsSynced: 0,
    invoicesSynced: 0,
    paymentsSynced: 0,
    errors: [] as string[],
  };

  // 60s per-tenant cap so one slow QBO account can't burn the whole Vercel
  // function budget. Timed-out syncs get logged as errors and retried next tick.
  const TENANT_TIMEOUT_MS = 60_000;

  for (const conn of connections) {
    try {
      const r = await Promise.race([
        syncQboData(conn.tenantId),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('tenant sync exceeded 60s')), TENANT_TIMEOUT_MS)
        ),
      ]);
      results.tenantsSynced++;
      results.invoicesSynced += r.invoicesSynced;
      results.paymentsSynced += r.paymentsSynced;
      if (r.errors.length) results.errors.push(`${conn.tenantId}: ${r.errors.join('; ')}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      results.errors.push(`${conn.tenantId}: ${msg}`);
      console.error('[cron:qbo-sync]', conn.tenantId, err);
    }
  }

  return NextResponse.json({
    ok: true,
    job: 'qbo-sync',
    ...results,
    staleRecovered: recovered.count,
    durationMs: Date.now() - startedAt,
    ts: startedAt,
  });
}
