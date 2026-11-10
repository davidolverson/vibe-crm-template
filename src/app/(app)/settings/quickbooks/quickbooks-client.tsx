'use client';

import { useState, useTransition } from 'react';
import { RefreshCw, Link2, LinkIcon, AlertTriangle } from 'lucide-react';
import { getQboConnectUrl, disconnectQbo, forceSyncQbo } from './actions';

export function QuickBooksClient(props: {
  connected: boolean;
  realmId: string | null;
  syncStatus: string;
  lastSyncAt: string | null;
  tokenExpiresAt: string | null;
  lastError: string | null;
  lastSync: {
    startedAt: string;
    completedAt: string | null;
    status: string;
    recordsSynced: number;
    errorMessage: string | null;
  } | null;
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function handleConnect() {
    startTransition(async () => {
      const r = await getQboConnectUrl();
      if (!r.success) return flash(r.error);
      window.location.href = r.data.url;
    });
  }

  function handleDisconnect() {
    if (!confirm('Disconnect QuickBooks? Synced invoices and payments will be preserved.')) return;
    startTransition(async () => {
      const r = await disconnectQbo();
      if (!r.success) return flash(r.error);
      flash('Disconnected');
    });
  }

  function handleForceSync() {
    startTransition(async () => {
      const r = await forceSyncQbo();
      if (!r.success) return flash(r.error);
      flash(`Synced ${r.data.invoices} invoices, ${r.data.payments} payments`);
    });
  }

  const statusColor: Record<string, string> = {
    idle: 'bg-emerald-400',
    syncing: 'bg-amber-400',
    error: 'bg-red-400',
    disconnected: 'bg-zinc-600',
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className="rounded-md border border-[#D4A017]/40 bg-[#D4A017]/10 px-4 py-2 text-sm text-[#D4A017]">
          {toast}
        </div>
      )}

      {/* Connection card */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className={['h-2 w-2 rounded-full', statusColor[props.syncStatus] ?? 'bg-zinc-600'].join(' ')} />
              <h2 className="text-sm font-semibold text-white">
                {props.connected ? 'Connected' : 'Not connected'}
              </h2>
            </div>
            {props.connected && (
              <div className="mt-2 space-y-0.5 text-xs text-zinc-500">
                <div>Realm ID: {props.realmId}</div>
                <div>Sync status: {props.syncStatus}</div>
                {props.lastSyncAt && <div>Last sync: {new Date(props.lastSyncAt).toLocaleString()}</div>}
                {props.tokenExpiresAt && (
                  <div>Token expires: {new Date(props.tokenExpiresAt).toLocaleString()}</div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {!props.connected ? (
              <button
                onClick={handleConnect}
                disabled={!props.canEdit || pending}
                className="inline-flex items-center gap-1.5 rounded-md bg-[#D4A017] px-4 py-2 text-sm font-semibold text-[#0A0A0F] hover:bg-[#D4A017]/90 disabled:opacity-40"
              >
                <Link2 className="h-4 w-4" /> Connect QuickBooks
              </button>
            ) : (
              <>
                <button
                  onClick={handleForceSync}
                  disabled={!props.canEdit || pending || props.syncStatus === 'syncing'}
                  className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:border-[#D4A017] hover:text-[#D4A017] disabled:opacity-40"
                >
                  <RefreshCw className={['h-4 w-4', pending ? 'animate-spin' : ''].join(' ')} />
                  Sync now
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={!props.canEdit || pending}
                  className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 px-3 py-2 text-xs text-zinc-500 hover:border-red-400 hover:text-red-400 disabled:opacity-40"
                >
                  <LinkIcon className="h-3.5 w-3.5" /> Disconnect
                </button>
              </>
            )}
          </div>
        </div>

        {props.lastError && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/5 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-red-400" />
            <div className="text-xs text-red-300">{props.lastError}</div>
          </div>
        )}
      </section>

      {/* Last sync details */}
      {props.lastSync && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h2 className="text-sm font-semibold text-white mb-3">Most recent sync</h2>
          <dl className="grid grid-cols-2 gap-y-2 text-xs">
            <dt className="text-zinc-500">Started</dt>
            <dd className="text-zinc-300">{new Date(props.lastSync.startedAt).toLocaleString()}</dd>
            <dt className="text-zinc-500">Completed</dt>
            <dd className="text-zinc-300">
              {props.lastSync.completedAt ? new Date(props.lastSync.completedAt).toLocaleString() : 'In progress'}
            </dd>
            <dt className="text-zinc-500">Status</dt>
            <dd
              className={[
                props.lastSync.status === 'completed'
                  ? 'text-emerald-300'
                  : props.lastSync.status === 'error'
                  ? 'text-red-300'
                  : 'text-amber-300',
              ].join(' ')}
            >
              {props.lastSync.status}
            </dd>
            <dt className="text-zinc-500">Records synced</dt>
            <dd className="text-zinc-300">{props.lastSync.recordsSynced}</dd>
            {props.lastSync.errorMessage && (
              <>
                <dt className="text-zinc-500">Error</dt>
                <dd className="text-red-300">{props.lastSync.errorMessage}</dd>
              </>
            )}
          </dl>
        </section>
      )}
    </div>
  );
}
