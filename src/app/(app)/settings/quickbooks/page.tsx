import Link from 'next/link';
import { withPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { QuickBooksClient } from './quickbooks-client';

export const metadata = { title: 'QuickBooks | VIBE Settings' };

export default async function QuickBooksSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; connected?: string }>;
}) {
  const sp = await searchParams;

  const data = await withPermission('settings.view', async (ctx) => {
    const [connection, lastSync, canEdit] = await Promise.all([
      prisma.qboConnection.findUnique({
        where: { tenantId: ctx.tenantId },
        select: {
          realmId: true,
          tokenExpiresAt: true,
          syncStatus: true,
          lastSyncAt: true,
          lastError: true,
          createdAt: true,
        },
      }),
      prisma.qboSyncLog.findFirst({
        where: { tenantId: ctx.tenantId },
        orderBy: { startedAt: 'desc' },
        take: 1,
        select: {
          startedAt: true,
          completedAt: true,
          status: true,
          recordsSynced: true,
          errorMessage: true,
        },
      }),
      prisma.permission.findUnique({
        where: {
          roleId_resource_action: {
            roleId: ctx.roleId,
            resource: 'settings',
            action: 'edit',
          },
        },
      }),
    ]);

    return {
      connected: !!connection,
      realmId: connection?.realmId ?? null,
      syncStatus: connection?.syncStatus ?? 'disconnected',
      lastSyncAt: connection?.lastSyncAt?.toISOString() ?? null,
      tokenExpiresAt: connection?.tokenExpiresAt?.toISOString() ?? null,
      lastError: connection?.lastError ?? null,
      lastSync: lastSync
        ? {
            startedAt: lastSync.startedAt.toISOString(),
            completedAt: lastSync.completedAt?.toISOString() ?? null,
            status: lastSync.status,
            recordsSynced: lastSync.recordsSynced,
            errorMessage: lastSync.errorMessage,
          }
        : null,
      canEdit: !!canEdit,
    };
  });

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-8">
      <div>
        <Link href="/settings" className="text-sm text-zinc-500 hover:text-[#D4A017]">
          &larr; Back to Settings
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">QuickBooks</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Connect QuickBooks Online to pull invoices and payments into your CFO dashboard. Syncs hourly.
        </p>
      </div>

      {sp.error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          Connection failed: {decodeURIComponent(sp.error)}
        </div>
      )}
      {sp.connected && (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
          QuickBooks connected. First sync will run within the hour.
        </div>
      )}

      <QuickBooksClient
        connected={data.connected}
        realmId={data.realmId}
        syncStatus={data.syncStatus}
        lastSyncAt={data.lastSyncAt}
        tokenExpiresAt={data.tokenExpiresAt}
        lastError={data.lastError}
        lastSync={data.lastSync}
        canEdit={data.canEdit}
      />
    </div>
  );
}
