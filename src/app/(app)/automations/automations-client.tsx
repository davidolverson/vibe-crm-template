'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2, Zap, CheckCircle2 } from 'lucide-react';
import {
  createAutomation,
  toggleAutomation,
  deleteAutomation,
  type ActionSpec,
  type ConditionSpec,
} from './actions';
import type { AutomationTrigger } from '@/generated/prisma/enums';

interface Automation {
  id: string;
  name: string;
  triggerType: AutomationTrigger;
  enabled: boolean;
  fireCount: number;
  createdAt: string;
  conditions: unknown;
  actions: unknown;
}

interface Sequence {
  id: string;
  name: string;
}

const TRIGGERS: { key: AutomationTrigger; label: string; description: string }[] = [
  { key: 'form_submitted', label: 'Form submitted', description: 'Fires every time a public form is submitted.' },
  { key: 'lead_not_contacted', label: 'Lead not contacted', description: 'Fires when a new lead has no activity after N minutes.' },
  { key: 'deal_stage_changed', label: 'Deal stage changed', description: 'Fires when a deal moves between stages.' },
  { key: 'contact_created', label: 'Contact created', description: 'Fires on every new contact.' },
];

export function AutomationsClient(props: {
  automations: Automation[];
  sequences: Sequence[];
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState<AutomationTrigger>('lead_not_contacted');
  const [windowMinutes, setWindowMinutes] = useState(15);
  const [actionKind, setActionKind] = useState<ActionSpec['kind']>('notify_role');
  const [role, setRole] = useState<'Owner' | 'Admin' | 'Producer'>('Owner');
  const [taskTitle, setTaskTitle] = useState('');
  const [sequenceId, setSequenceId] = useState('');

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function buildAction(): ActionSpec {
    switch (actionKind) {
      case 'notify_role':
        return { kind: 'notify_role', role };
      case 'create_task':
        return { kind: 'create_task', title: taskTitle.trim() || 'Follow up' };
      case 'enroll_in_sequence':
        return { kind: 'enroll_in_sequence', sequenceId };
      default:
        return { kind: 'notify_user' };
    }
  }

  function handleCreate() {
    const conditions: ConditionSpec = {};
    if (trigger === 'lead_not_contacted') conditions.windowMinutes = windowMinutes;

    startTransition(async () => {
      const r = await createAutomation({
        name,
        triggerType: trigger,
        conditions,
        actions: buildAction(),
      });
      if (!r.success) return flash(r.error);
      setName('');
      setWindowMinutes(15);
      setActionKind('notify_role');
      setTaskTitle('');
      setSequenceId('');
      setShowForm(false);
      flash('Automation created');
    });
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="rounded-md border border-[#D4A017]/40 bg-[#D4A017]/10 px-4 py-2 text-sm text-[#D4A017]">
          {toast}
        </div>
      )}

      {props.canEdit && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-md bg-[#D4A017] px-4 py-2 text-sm font-semibold text-[#0A0A0F] hover:bg-[#D4A017]/90"
        >
          <Plus className="h-4 w-4" /> New automation
        </button>
      )}

      {showForm && (
        <div className="rounded-xl border border-[#D4A017]/40 bg-zinc-900/40 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">New automation</h3>

          <div>
            <label className="mb-1 block text-xs text-zinc-400">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 15-min lead response alert"
              className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-[#D4A017]"
              disabled={pending}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs text-zinc-400">Trigger</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {TRIGGERS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTrigger(t.key)}
                  className={`rounded-md border p-3 text-left text-sm ${
                    trigger === t.key
                      ? 'border-[#D4A017] bg-[#D4A017]/10'
                      : 'border-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  <div className="font-medium text-white">{t.label}</div>
                  <div className="mt-1 text-xs text-zinc-500">{t.description}</div>
                </button>
              ))}
            </div>
          </div>

          {trigger === 'lead_not_contacted' && (
            <div>
              <label className="mb-1 block text-xs text-zinc-400">Window (minutes)</label>
              <input
                type="number"
                min={1}
                max={1440}
                value={windowMinutes}
                onChange={(e) => setWindowMinutes(Number(e.target.value) || 15)}
                className="w-32 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
                disabled={pending}
              />
            </div>
          )}

          <div>
            <label className="mb-2 block text-xs text-zinc-400">Action</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(['notify_role', 'create_task', 'enroll_in_sequence'] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setActionKind(k)}
                  className={`rounded-md border px-3 py-2 text-xs font-medium ${
                    actionKind === k
                      ? 'border-[#D4A017] bg-[#D4A017]/10 text-[#D4A017]'
                      : 'border-zinc-800 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  {k.replace(/_/g, ' ')}
                </button>
              ))}
            </div>

            {actionKind === 'notify_role' && (
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'Owner' | 'Admin' | 'Producer')}
                className="mt-3 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
                disabled={pending}
              >
                <option value="Owner">Owner</option>
                <option value="Admin">Admin</option>
                <option value="Producer">Producer</option>
              </select>
            )}

            {actionKind === 'create_task' && (
              <input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Task title (e.g. Follow up with new lead)"
                className="mt-3 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
                disabled={pending}
              />
            )}

            {actionKind === 'enroll_in_sequence' && (
              <select
                value={sequenceId}
                onChange={(e) => setSequenceId(e.target.value)}
                className="mt-3 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white"
                disabled={pending}
              >
                <option value="">Pick an active sequence...</option>
                {props.sequences.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowForm(false)}
              className="rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={
                pending ||
                !name.trim() ||
                (actionKind === 'enroll_in_sequence' && !sequenceId)
              }
              className="rounded-md bg-[#D4A017] px-4 py-2 text-sm font-semibold text-[#0A0A0F] hover:bg-[#D4A017]/90 disabled:opacity-40"
            >
              Create
            </button>
          </div>
        </div>
      )}

      {props.automations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-10 text-center">
          <Zap className="mx-auto h-8 w-8 text-zinc-600" />
          <p className="mt-3 text-sm text-zinc-500">No automations yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {props.automations.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white">{a.name}</h3>
                  {a.enabled ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <span className="text-xs text-zinc-600">disabled</span>
                  )}
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  Trigger: <span className="text-zinc-300">{a.triggerType.replace(/_/g, ' ')}</span> · fired {a.fireCount}×
                </div>
              </div>
              {props.canEdit && (
                <div className="flex items-center gap-2">
                  <button
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const r = await toggleAutomation(a.id, !a.enabled);
                        if (!r.success) return flash(r.error);
                        flash(a.enabled ? 'Disabled' : 'Enabled');
                      })
                    }
                    className="rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-200 hover:border-[#D4A017] hover:text-[#D4A017]"
                  >
                    {a.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    disabled={pending}
                    onClick={() => {
                      if (!confirm(`Delete "${a.name}"?`)) return;
                      startTransition(async () => {
                        const r = await deleteAutomation(a.id);
                        if (!r.success) return flash(r.error);
                        flash('Deleted');
                      });
                    }}
                    className="text-zinc-600 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
