'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, ClipboardCopy, Code2, FileText, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { setFormDefaultSequence } from '../actions';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FormField {
  id: string;
  label: string;
  type: string;
  required: boolean;
  position: number;
}

interface FormData {
  id: string;
  name: string;
  active: boolean;
  defaultSequenceId: string | null;
  createdAt: string;
  submissionCount: number;
  fields: FormField[];
}

interface Submission {
  id: string;
  payloadJson: Record<string, unknown>;
  ipAddress: string | null;
  contactId: string | null;
  createdAt: string;
}

interface SequenceOption {
  id: string;
  name: string;
}

interface Props {
  form: FormData;
  submissions: Submission[];
  sequences: SequenceOption[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function extractField(
  payload: Record<string, unknown>,
  ...keys: string[]
): string {
  for (const k of keys) {
    const val = payload[k];
    if (typeof val === 'string' && val.trim() !== '') return val.trim();
  }
  return '';
}

function buildEmbedSnippet(formId: string, fields: FormField[], origin: string): string {
  const actionUrl = `${origin}/api/forms/${formId}/submit`;

  const fieldInputs = fields
    .map((f) => {
      const key = f.label.toLowerCase().replace(/\s+/g, '_');
      const required = f.required ? ' required' : '';
      const placeholder = f.label;

      let inputHtml = '';
      if (f.type === 'textarea') {
        inputHtml = `  <textarea name="${key}" placeholder="${placeholder}"${required} style="width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:6px;font-size:14px;font-family:inherit;resize:vertical;min-height:100px;box-sizing:border-box;"></textarea>`;
      } else {
        const inputType =
          f.type === 'email' ? 'email' : f.type === 'phone' ? 'tel' : 'text';
        inputHtml = `  <input type="${inputType}" name="${key}" placeholder="${placeholder}"${required} style="width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:6px;font-size:14px;font-family:inherit;box-sizing:border-box;" />`;
      }

      return `  <label style="display:block;font-size:13px;font-weight:500;color:#374151;margin-bottom:4px;">${f.label}${f.required ? ' <span style="color:#ef4444;">*</span>' : ''}</label>\n${inputHtml}`;
    })
    .join('\n\n');

  return `<form
  action="${actionUrl}"
  method="POST"
  id="vibe-form-${formId.slice(0, 8)}"
  style="max-width:480px;font-family:system-ui,sans-serif;display:flex;flex-direction:column;gap:16px;"
>
${fieldInputs}

  <button
    type="submit"
    style="padding:11px 24px;background:#111827;color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:600;cursor:pointer;align-self:flex-start;"
  >
    Submit
  </button>

  <p id="vibe-msg-${formId.slice(0, 8)}" style="font-size:13px;color:#16a34a;display:none;margin:0;">
    Thank you! Your submission was received.
  </p>
</form>

<script>
(function () {
  var form = document.getElementById('vibe-form-${formId.slice(0, 8)}');
  var msg  = document.getElementById('vibe-msg-${formId.slice(0, 8)}');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var data = {};
    var els = form.elements;
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.name) data[el.name] = el.value;
    }
    var btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }

    fetch('${actionUrl}', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.success) {
          form.reset();
          if (msg) { msg.style.display = 'block'; }
        } else {
          alert(res.error || 'Submission failed. Please try again.');
          if (btn) { btn.disabled = false; btn.textContent = 'Submit'; }
        }
      })
      .catch(function () {
        alert('Network error. Please try again.');
        if (btn) { btn.disabled = false; btn.textContent = 'Submit'; }
      });
  });
})();
</script>`;
}

// ---------------------------------------------------------------------------
// Copy button
// ---------------------------------------------------------------------------

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-1.5 font-medium"
      onClick={handleCopy}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-green-400" />
          Copied
        </>
      ) : (
        <>
          <ClipboardCopy className="h-3.5 w-3.5" />
          {label}
        </>
      )}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Submissions tab
// ---------------------------------------------------------------------------

function SubmissionsTab({ submissions, fields }: { submissions: Submission[]; fields: FormField[] }) {
  if (submissions.length === 0) {
    return (
      <div className="rounded-lg border border-border py-16 text-center text-muted-foreground">
        No submissions yet. Embed the form on your website to start collecting leads.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Submitted</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            {fields
              .filter((f) => !['first_name', 'last_name', 'email', 'phone'].includes(
                f.label.toLowerCase().replace(/\s+/g, '_')
              ))
              .slice(0, 3)
              .map((f) => (
                <TableHead key={f.id}>{f.label}</TableHead>
              ))}
            <TableHead>IP Address</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {submissions.map((sub) => {
            const p = sub.payloadJson;
            const firstName = extractField(p, 'first_name', 'First Name', 'firstName');
            const lastName = extractField(p, 'last_name', 'Last Name', 'lastName');
            const name =
              firstName || lastName
                ? `${firstName} ${lastName}`.trim()
                : extractField(p, 'name', 'Name') || 'Unknown';
            const email = extractField(p, 'email', 'Email');
            const phone = extractField(p, 'phone', 'Phone');

            const extraFields = fields.filter(
              (f) =>
                !['first_name', 'last_name', 'email', 'phone'].includes(
                  f.label.toLowerCase().replace(/\s+/g, '_')
                )
            ).slice(0, 3);

            return (
              <TableRow key={sub.id}>
                <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                  {formatDateTime(sub.createdAt)}
                </TableCell>
                <TableCell className="font-medium text-foreground">{name}</TableCell>
                <TableCell className="text-muted-foreground">{email || '-'}</TableCell>
                <TableCell className="text-muted-foreground">{phone || '-'}</TableCell>
                {extraFields.map((f) => {
                  const key = f.label.toLowerCase().replace(/\s+/g, '_');
                  const val = extractField(p, key, f.label);
                  return (
                    <TableCell key={f.id} className="text-muted-foreground max-w-[200px] truncate">
                      {val || '-'}
                    </TableCell>
                  );
                })}
                <TableCell className="text-muted-foreground text-xs font-mono">
                  {sub.ipAddress ?? '-'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Embed tab
// ---------------------------------------------------------------------------

function EmbedTab({ formId, fields }: { formId: string; fields: FormField[] }) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://your-app.com';
  const snippet = buildEmbedSnippet(formId, fields, origin);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">HTML Embed Snippet</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Paste this into any webpage. The form submits via fetch to stay on the page.
            </p>
          </div>
          <CopyButton text={snippet} label="Copy Snippet" />
        </div>

        <pre className="bg-zinc-900 border border-zinc-800 rounded-md p-4 text-xs text-zinc-300 overflow-x-auto leading-relaxed whitespace-pre">
          {snippet}
        </pre>
      </div>

      <div className="rounded-lg border border-border p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Live Preview</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            This is how the form will appear on a white background. Styling can be customized.
          </p>
        </div>

        <div className="bg-white rounded-lg p-6 border border-zinc-200">
          <EmbedPreview fields={fields} />
        </div>
      </div>

      <div className="rounded-lg border border-border p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Direct API Endpoint</h3>
        <p className="text-xs text-muted-foreground">
          Send a POST request with a JSON body. Required fields are marked with *.
          Keys use the field label lowercased with spaces replaced by underscores.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-xs text-zinc-300 font-mono break-all">
            POST {origin}/api/forms/{formId}/submit
          </code>
          <CopyButton text={`${origin}/api/forms/${formId}/submit`} label="Copy URL" />
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Expected JSON keys:</p>
          <div className="flex flex-wrap gap-1.5">
            {fields.map((f) => (
              <code
                key={f.id}
                className="text-xs bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-mono"
              >
                {f.label.toLowerCase().replace(/\s+/g, '_')}
                {f.required ? (
                  <span className="text-red-400 ml-0.5">*</span>
                ) : null}
              </code>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Embed preview (rendered in white box)
// ---------------------------------------------------------------------------

function EmbedPreview({ fields }: { fields: FormField[] }) {
  return (
    <form
      className="flex flex-col gap-4 max-w-md"
      onSubmit={(e) => e.preventDefault()}
      style={{ fontFamily: 'system-ui, sans-serif' }}
    >
      {fields.map((f) => (
        <div key={f.id} className="flex flex-col gap-1">
          <label
            style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}
          >
            {f.label}
            {f.required && (
              <span style={{ color: '#ef4444', marginLeft: 3 }}>*</span>
            )}
          </label>
          {f.type === 'textarea' ? (
            <textarea
              placeholder={f.label}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 14,
                fontFamily: 'inherit',
                resize: 'vertical',
                minHeight: 100,
                boxSizing: 'border-box',
              }}
              readOnly
            />
          ) : (
            <input
              type={f.type === 'email' ? 'email' : f.type === 'phone' ? 'tel' : 'text'}
              placeholder={f.label}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 14,
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
              readOnly
            />
          )}
        </div>
      ))}
      <button
        type="submit"
        style={{
          padding: '11px 24px',
          background: '#111827',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          alignSelf: 'flex-start',
        }}
      >
        Submit
      </button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------

type Tab = 'submissions' | 'embed';

export function FormDetailClient({ form, submissions, sequences }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('submissions');
  const [selectedSequenceId, setSelectedSequenceId] = useState<string>(
    form.defaultSequenceId ?? ''
  );
  const [savingSequence, startSequenceTransition] = useTransition();

  function handleSequenceChange(next: string) {
    setSelectedSequenceId(next);
    startSequenceTransition(async () => {
      const result = await setFormDefaultSequence(form.id, next || null);
      if (result.success) {
        toast.success(next ? 'Default sequence updated' : 'Default sequence removed');
      } else {
        toast.error(result.error);
        // Revert on failure
        setSelectedSequenceId(form.defaultSequenceId ?? '');
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          href="/forms"
          className="mt-0.5 text-muted-foreground hover:text-foreground transition-colors"
          title="Back to forms"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground truncate">{form.name}</h1>
            <Badge
              variant="outline"
              className={
                form.active
                  ? 'border-green-500/40 bg-green-500/10 text-green-400'
                  : 'border-zinc-600 bg-zinc-800/50 text-zinc-400'
              }
            >
              {form.active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Created {formatDate(form.createdAt)} &middot; {form.fields.length} field{form.fields.length !== 1 ? 's' : ''} &middot;{' '}
            {form.submissionCount} submission{form.submissionCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Fields summary */}
      <div className="rounded-lg border border-border p-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Fields
        </p>
        <div className="flex flex-wrap gap-2">
          {form.fields.map((f) => (
            <span
              key={f.id}
              className="inline-flex items-center gap-1.5 text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 px-2.5 py-1 rounded-full"
            >
              <span className="text-zinc-500 font-mono text-[10px] uppercase">{f.type}</span>
              {f.label}
              {f.required && <span className="text-red-400 text-[10px]">*</span>}
            </span>
          ))}
        </div>
      </div>

      {/* Automation -- auto-enroll in sequence */}
      <div className="rounded-lg border border-border p-4">
        <div className="flex items-start gap-3">
          <Zap className="mt-0.5 h-4 w-4 text-[#D4A017] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Automation
            </p>
            <p className="mt-1 text-sm text-foreground">Auto-enroll new contacts in a sequence</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              When this form is submitted, the new contact is immediately enrolled in the chosen
              active sequence. Pick &ldquo;None&rdquo; to disable.
            </p>
            {sequences.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                No active sequences yet.{' '}
                <Link href="/sequences" className="text-[#D4A017] hover:underline">
                  Create one
                </Link>
                .
              </p>
            ) : (
              <div className="mt-3 flex items-center gap-2">
                <select
                  value={selectedSequenceId}
                  onChange={(e) => handleSequenceChange(e.target.value)}
                  disabled={savingSequence}
                  className="w-full max-w-xs rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-foreground focus:border-[#D4A017] focus:outline-none disabled:opacity-60"
                >
                  <option value="">None</option>
                  {sequences.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {savingSequence && (
                  <span className="text-xs text-muted-foreground">Saving...</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex gap-0" aria-label="Form detail tabs">
          <TabButton
            icon={<FileText className="h-3.5 w-3.5" />}
            label={`Submissions${form.submissionCount > 0 ? ` (${form.submissionCount})` : ''}`}
            active={activeTab === 'submissions'}
            onClick={() => setActiveTab('submissions')}
          />
          <TabButton
            icon={<Code2 className="h-3.5 w-3.5" />}
            label="Embed Code"
            active={activeTab === 'embed'}
            onClick={() => setActiveTab('embed')}
          />
        </nav>
      </div>

      {/* Tab panels */}
      {activeTab === 'submissions' && (
        <SubmissionsTab submissions={submissions} fields={form.fields} />
      )}
      {activeTab === 'embed' && (
        <EmbedTab formId={form.id} fields={form.fields} />
      )}
    </div>
  );
}

function TabButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
        active
          ? 'border-[#D4A017] text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
      ].join(' ')}
    >
      {icon}
      {label}
    </button>
  );
}
