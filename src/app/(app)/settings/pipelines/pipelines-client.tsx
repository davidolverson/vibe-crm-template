'use client';

import { useState, useTransition } from 'react';
import { Download, CheckCircle2, TrendingUp, Home, Shield, Briefcase, Trash2 } from 'lucide-react';
import { installPipelineTemplate, uninstallPipelineTemplate } from './actions';
import type { PipelineKind } from '@/lib/pipeline-templates';

const KIND_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  real_estate: Home,
  mortgage: TrendingUp,
  insurance: Shield,
  investment: Briefcase,
};

const KIND_LABELS: Record<string, string> = {
  real_estate: 'Real Estate',
  mortgage: 'Mortgage',
  insurance: 'Insurance',
  investment: 'Investment',
  custom: 'Custom',
};

interface Installed {
  id: string;
  name: string;
  kind: string;
  isDefault: boolean;
  stageCount: number;
  dealCount: number;
}

interface Available {
  key: PipelineKind;
  name: string;
  description: string;
  stageCount: number;
}

export function PipelinesClient(props: { installed: Installed[]; available: Available[] }) {
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function handleInstall(kind: PipelineKind) {
    startTransition(async () => {
      const r = await installPipelineTemplate(kind);
      if (!r.success) return flash(r.error);
      flash(`${KIND_LABELS[kind]} installed`);
    });
  }

  function handleUninstall(p: Installed) {
    if (p.isDefault) return flash('Cannot remove the default pipeline');
    if (p.dealCount > 0) {
      return flash(`Move or delete ${p.dealCount} deal${p.dealCount === 1 ? '' : 's'} first`);
    }
    const confirmed = typeof window !== 'undefined'
      ? window.confirm(`Remove the ${p.name} pipeline? This cannot be undone.`)
      : false;
    if (!confirmed) return;
    startTransition(async () => {
      const r = await uninstallPipelineTemplate(p.id);
      if (!r.success) return flash(r.error);
      flash(`${p.name} removed`);
    });
  }

  return (
    <div className="space-y-8">
      {toast && (
        <div className="rounded-md border border-[#D4A017]/40 bg-[#D4A017]/10 px-4 py-2 text-sm text-[#D4A017]">
          {toast}
        </div>
      )}

      {/* Installed */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Installed</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {props.installed.map((p) => {
            const Icon = KIND_ICONS[p.kind] ?? Home;
            return (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-[#D4A017]" />
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      {p.name}
                      {p.isDefault && (
                        <span className="rounded-full bg-[#D4A017]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#D4A017]">
                          default
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {p.stageCount} stages · {p.dealCount} deals
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  {!p.isDefault && (
                    <button
                      onClick={() => handleUninstall(p)}
                      disabled={pending || p.dealCount > 0}
                      title={p.dealCount > 0 ? `Move or delete ${p.dealCount} deal(s) first` : 'Remove pipeline'}
                      className="inline-flex items-center gap-1 rounded-md border border-zinc-800 px-2 py-1 text-[11px] text-zinc-400 hover:border-red-500/40 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 className="h-3 w-3" />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Available */}
      {props.available.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Install a template</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {props.available.map((t) => {
              const Icon = KIND_ICONS[t.key] ?? Home;
              return (
                <div
                  key={t.key}
                  className="flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/40 p-5"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-zinc-400" />
                    <h3 className="text-sm font-semibold text-white">{t.name}</h3>
                  </div>
                  <p className="mt-2 flex-1 text-sm text-zinc-400">{t.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs text-zinc-600">{t.stageCount} stages</span>
                    <button
                      onClick={() => handleInstall(t.key)}
                      disabled={pending}
                      className="inline-flex items-center gap-1.5 rounded-md bg-[#D4A017] px-3 py-1.5 text-xs font-semibold text-[#0A0A0F] hover:bg-[#D4A017]/90 disabled:opacity-40"
                    >
                      <Download className="h-3 w-3" /> Install
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
