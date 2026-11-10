'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2, Mail, MessageSquare, Clock, Play, Pause, FileText, X } from 'lucide-react';
import {
  createSequence,
  updateSequenceStatus,
  deleteSequence,
  addStep,
  removeStep,
} from './actions';

interface Step {
  id: string;
  stepOrder: number;
  type: string;
  delayDays: number;
  delayHours: number;
  templateName: string | null;
  smsBody: string | null;
}

interface Sequence {
  id: string;
  name: string;
  status: string;
  enrollmentCount: number;
  createdAt: string;
  steps: Step[];
}

interface Template {
  id: string;
  name: string;
  subject: string;
}

const STEP_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  sms: MessageSquare,
  wait: Clock,
};

export function SequencesClient(props: {
  sequences: Sequence[];
  templates: Template[];
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await createSequence(newName);
      if (!r.success) return flash(r.error);
      setNewName('');
      flash('Sequence created');
    });
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="rounded-md border border-[#D4A017]/40 bg-[#D4A017]/10 px-4 py-2 text-sm text-[#D4A017]">
          {toast}
        </div>
      )}

      {/* Create form */}
      {props.canEdit && (
        <form
          onSubmit={handleCreate}
          className="flex gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"
        >
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New sequence name..."
            className="flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-[#D4A017]"
            disabled={pending}
          />
          <button
            type="submit"
            disabled={pending || !newName.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#D4A017] px-4 py-2 text-sm font-semibold text-[#0A0A0F] hover:bg-[#D4A017]/90 disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
            Create
          </button>
        </form>
      )}

      {/* List */}
      {props.sequences.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-10 text-center">
          <FileText className="mx-auto h-8 w-8 text-zinc-600" />
          <p className="mt-3 text-sm text-zinc-500">No sequences yet. Create one above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {props.sequences.map((seq) => (
            <SequenceCard
              key={seq.id}
              seq={seq}
              templates={props.templates}
              canEdit={props.canEdit}
              pending={pending}
              expanded={editingId === seq.id}
              onToggle={() => setEditingId(editingId === seq.id ? null : seq.id)}
              onFlash={flash}
              startTransition={startTransition}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SequenceCard(props: {
  seq: Sequence;
  templates: Template[];
  canEdit: boolean;
  pending: boolean;
  expanded: boolean;
  onToggle: () => void;
  onFlash: (msg: string) => void;
  startTransition: (fn: () => void) => void;
}) {
  const { seq, templates, canEdit, pending, expanded, onToggle, onFlash, startTransition } = props;

  const [stepType, setStepType] = useState<'email' | 'sms' | 'wait'>('email');
  const [templateId, setTemplateId] = useState('');
  const [smsBody, setSmsBody] = useState('');
  const [delayDays, setDelayDays] = useState(0);
  const [delayHours, setDelayHours] = useState(0);

  function handleAddStep() {
    startTransition(async () => {
      const r = await addStep({
        sequenceId: seq.id,
        type: stepType,
        templateId: stepType === 'email' ? templateId : undefined,
        smsBody: stepType === 'sms' ? smsBody : undefined,
        delayDays,
        delayHours,
      });
      if (!r.success) return onFlash(r.error);
      setTemplateId('');
      setSmsBody('');
      setDelayDays(0);
      setDelayHours(0);
      onFlash('Step added');
    });
  }

  const statusColor =
    seq.status === 'active'
      ? 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30'
      : seq.status === 'paused'
      ? 'bg-amber-400/15 text-amber-300 border-amber-400/30'
      : 'bg-zinc-500/10 text-zinc-400 border-zinc-600/30';

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40">
      <div className="flex items-start justify-between p-5">
        <button onClick={onToggle} className="flex-1 text-left">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold text-white">{seq.name}</h3>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusColor}`}>
              {seq.status}
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {seq.steps.length} {seq.steps.length === 1 ? 'step' : 'steps'} · {seq.enrollmentCount}{' '}
            enrolled
          </p>
        </button>

        {canEdit && (
          <div className="flex items-center gap-1">
            {seq.status !== 'active' ? (
              <button
                disabled={pending || seq.steps.length === 0}
                onClick={() =>
                  startTransition(async () => {
                    const r = await updateSequenceStatus(seq.id, 'active');
                    if (!r.success) return onFlash(r.error);
                    onFlash('Activated');
                  })
                }
                className="inline-flex items-center gap-1 rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-emerald-300 hover:border-emerald-400 disabled:opacity-40"
                title={seq.steps.length === 0 ? 'Add steps first' : 'Activate'}
              >
                <Play className="h-3 w-3" /> Activate
              </button>
            ) : (
              <button
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const r = await updateSequenceStatus(seq.id, 'paused');
                    if (!r.success) return onFlash(r.error);
                    onFlash('Paused');
                  })
                }
                className="inline-flex items-center gap-1 rounded-md border border-zinc-700 px-2.5 py-1 text-xs text-amber-300 hover:border-amber-400"
              >
                <Pause className="h-3 w-3" /> Pause
              </button>
            )}
            <button
              disabled={pending}
              onClick={() => {
                if (!confirm(`Delete "${seq.name}"? This removes all enrollments.`)) return;
                startTransition(async () => {
                  const r = await deleteSequence(seq.id);
                  if (!r.success) return onFlash(r.error);
                  onFlash('Deleted');
                });
              }}
              className="text-zinc-600 hover:text-red-400 p-1"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {expanded && (
        <div className="border-t border-zinc-800 p-5 space-y-4">
          {/* Existing steps */}
          {seq.steps.length > 0 && (
            <ol className="space-y-2">
              {seq.steps.map((step) => {
                const Icon = STEP_ICON[step.type] ?? Clock;
                return (
                  <li
                    key={step.id}
                    className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-zinc-600">
                        {step.stepOrder + 1}
                      </span>
                      <Icon className="h-4 w-4 text-[#D4A017]" />
                      <span className="text-sm text-zinc-200">
                        {step.type === 'email'
                          ? `Email: ${step.templateName ?? 'missing template'}`
                          : step.type === 'sms'
                          ? `SMS: ${step.smsBody?.slice(0, 60)}${(step.smsBody?.length ?? 0) > 60 ? '...' : ''}`
                          : 'Wait'}
                      </span>
                      <span className="text-xs text-zinc-600">
                        after {step.delayDays}d {step.delayHours}h
                      </span>
                    </div>
                    {canEdit && (
                      <button
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            const r = await removeStep(step.id);
                            if (!r.success) return onFlash(r.error);
                            onFlash('Step removed');
                          })
                        }
                        className="text-zinc-600 hover:text-red-400"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          {/* Add step form */}
          {canEdit && (
            <div className="rounded-md border border-zinc-800 bg-zinc-950 p-4 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Add step
              </h4>
              <div className="flex gap-2">
                {(['email', 'sms', 'wait'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setStepType(t)}
                    className={`rounded-md border px-3 py-1.5 text-xs font-medium capitalize ${
                      stepType === t
                        ? 'border-[#D4A017] bg-[#D4A017]/10 text-[#D4A017]'
                        : 'border-zinc-800 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {stepType === 'email' && (
                <select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#D4A017]"
                  disabled={pending}
                >
                  <option value="">Pick a template...</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              )}

              {stepType === 'sms' && (
                <textarea
                  value={smsBody}
                  onChange={(e) => setSmsBody(e.target.value.slice(0, 1600))}
                  placeholder="SMS body (1600 char max)"
                  rows={3}
                  disabled={pending}
                  className="w-full resize-none rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[#D4A017]"
                />
              )}

              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 text-xs text-zinc-500">
                  Days
                  <input
                    type="number"
                    min={0}
                    max={365}
                    value={delayDays}
                    onChange={(e) => setDelayDays(Number(e.target.value) || 0)}
                    disabled={pending}
                    className="flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-sm text-white"
                  />
                </label>
                <label className="flex items-center gap-2 text-xs text-zinc-500">
                  Hours
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={delayHours}
                    onChange={(e) => setDelayHours(Number(e.target.value) || 0)}
                    disabled={pending}
                    className="flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-sm text-white"
                  />
                </label>
              </div>

              <button
                onClick={handleAddStep}
                disabled={
                  pending ||
                  (stepType === 'email' && !templateId) ||
                  (stepType === 'sms' && !smsBody.trim())
                }
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-[#D4A017] px-4 py-2 text-sm font-semibold text-[#0A0A0F] hover:bg-[#D4A017]/90 disabled:opacity-40"
              >
                <Plus className="h-3.5 w-3.5" /> Add step
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
