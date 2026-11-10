'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AiToolbar } from '@/components/ai/ai-toolbar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';
import {
  renameStage,
  addStage,
  reorderStage,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  type TeamMember,
  type StageRow,
  type EmailTemplateRow,
  type EmailTemplateCategory,
  type EmailTemplateInput,
  type AuditLogRow,
} from './actions';

// ---------------------------------------------------------------------------
// Colour map for role badges
// ---------------------------------------------------------------------------

const ROLE_COLORS: Record<string, string> = {
  Owner:
    'border-[#D4A017] text-[#D4A017]',
  Admin:
    'border-violet-500 text-violet-400',
  Producer:
    'border-sky-500 text-sky-400',
  Assistant:
    'border-emerald-500 text-emerald-400',
  'Transaction Coordinator':
    'border-orange-400 text-orange-300',
};

function roleBadgeClass(roleName: string): string {
  return ROLE_COLORS[roleName] ?? 'border-zinc-500 text-zinc-400';
}

// ---------------------------------------------------------------------------
// Category helpers
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<EmailTemplateCategory, string> = {
  follow_up: 'Follow Up',
  listing: 'Listing',
  mortgage: 'Mortgage',
  insurance: 'Insurance',
  investing: 'Investing',
};

const CATEGORY_COLORS: Record<EmailTemplateCategory, string> = {
  follow_up: 'border-sky-500 text-sky-400',
  listing: 'border-emerald-500 text-emerald-400',
  mortgage: 'border-[#D4A017] text-[#D4A017]',
  insurance: 'border-orange-400 text-orange-300',
  investing: 'border-violet-500 text-violet-400',
};

const ALL_CATEGORIES: EmailTemplateCategory[] = [
  'follow_up',
  'listing',
  'mortgage',
  'insurance',
  'investing',
];

const PLACEHOLDER_TOKENS = [
  { token: '{{contact_name}}', description: 'The full name of the contact' },
  { token: '{{company}}', description: 'The contact\'s company or organization' },
  { token: '{{user_name}}', description: 'Your name (the sending agent)' },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ProfileData {
  name: string;
  email: string;
  roleName: string;
  orgName: string;
  orgSlug: string;
  tenantId: string;
  memberCount: number;
  canEdit: boolean;
}

interface Props {
  profile: ProfileData;
  initialMembers: TeamMember[];
  initialStages: StageRow[];
  pipelineId: string | null;
  initialTemplates: EmailTemplateRow[];
  initialAuditLogs: AuditLogRow[];
}

// ---------------------------------------------------------------------------
// Profile tab
// ---------------------------------------------------------------------------

function ProfileTab({ profile }: { profile: ProfileData }) {
  const [displayName, setDisplayName] = useState(profile.name);
  const [showEditName, setShowEditName] = useState(false);
  const [nameValue, setNameValue] = useState(profile.name);
  const [isNamePending, startNameTransition] = useTransition();

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordPending, startPasswordTransition] = useTransition();

  function handleUpdateName() {
    const trimmed = nameValue.trim();
    if (!trimmed) {
      toast.error('Name cannot be empty');
      return;
    }
    if (trimmed === displayName) {
      setShowEditName(false);
      return;
    }

    startNameTransition(async () => {
      const result = await authClient.updateUser({ name: trimmed });
      if (result.error) {
        toast.error(result.error.message ?? 'Failed to update name');
      } else {
        setDisplayName(trimmed);
        setShowEditName(false);
        toast.success('Name updated');
      }
    });
  }

  function handleCancelEditName() {
    setNameValue(displayName);
    setShowEditName(false);
  }

  function handleChangePassword() {
    if (!currentPassword) {
      toast.error('Current password is required');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    startPasswordTransition(async () => {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: false,
      });
      if (result.error) {
        toast.error(result.error.message ?? 'Failed to change password');
      } else {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowChangePassword(false);
        toast.success('Password changed successfully');
      }
    });
  }

  function handleCancelChangePassword() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowChangePassword(false);
  }

  return (
    <div className="space-y-4">
      {/* Account info card */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
          <div>
            <CardTitle className="text-base text-white">Your Account</CardTitle>
            <CardDescription>Identity and access level</CardDescription>
          </div>
          {!showEditName && (
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0 text-zinc-400 hover:text-[#D4A017] border border-zinc-700 hover:border-[#D4A017] h-8 px-3 text-xs"
              onClick={() => {
                setNameValue(displayName);
                setShowEditName(true);
              }}
            >
              Edit Profile
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Name field - editable inline */}
            <div>
              <p className="text-zinc-500 mb-1">Name</p>
              {showEditName ? (
                <div className="space-y-2">
                  <Input
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleUpdateName();
                      if (e.key === 'Escape') handleCancelEditName();
                    }}
                    className="h-8 text-sm bg-zinc-800 border-zinc-700 text-white focus-visible:ring-[#D4A017]"
                    disabled={isNamePending}
                    maxLength={100}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-7 px-3 text-xs bg-[#D4A017] text-black hover:bg-[#D4A017]/90 font-medium"
                      onClick={handleUpdateName}
                      disabled={isNamePending}
                    >
                      {isNamePending ? 'Saving...' : 'Update Name'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-3 text-xs text-zinc-500 hover:text-zinc-300"
                      onClick={handleCancelEditName}
                      disabled={isNamePending}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="font-medium text-zinc-100">{displayName || '--'}</p>
              )}
            </div>

            <Field label="Email" value={profile.email} />

            <div>
              <p className="text-zinc-500 mb-1">Role</p>
              <Badge variant="outline" className={roleBadgeClass(profile.roleName)}>
                {profile.roleName}
              </Badge>
            </div>

            <Field label="Organization" value={profile.orgName} />

            {profile.orgSlug && (
              <Field label="Slug" value={profile.orgSlug} mono />
            )}

            <div>
              <p className="text-zinc-500 mb-1">Workspace ID</p>
              <p className="font-mono text-xs text-zinc-500 break-all">{profile.tenantId}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change password card */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3">
          <div>
            <CardTitle className="text-base text-white">Change Password</CardTitle>
            <CardDescription>Update your login credentials</CardDescription>
          </div>
          {!showChangePassword && (
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0 text-zinc-400 hover:text-[#D4A017] border border-zinc-700 hover:border-[#D4A017] h-8 px-3 text-xs"
              onClick={() => setShowChangePassword(true)}
            >
              Change Password
            </Button>
          )}
        </CardHeader>

        {showChangePassword && (
          <CardContent className="space-y-4 pt-0">
            <div className="rounded-md bg-zinc-800/50 border border-zinc-700/60 p-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wide">
                  Current Password
                </Label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="h-9 bg-zinc-800 border-zinc-700 text-white focus-visible:ring-[#D4A017]"
                  placeholder="Enter current password"
                  disabled={isPasswordPending}
                  autoComplete="current-password"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wide">
                  New Password
                </Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-9 bg-zinc-800 border-zinc-700 text-white focus-visible:ring-[#D4A017]"
                  placeholder="At least 8 characters"
                  disabled={isPasswordPending}
                  autoComplete="new-password"
                />
                {newPassword.length > 0 && newPassword.length < 8 && (
                  <p className="text-xs text-red-400">Must be at least 8 characters</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-zinc-400 text-xs uppercase tracking-wide">
                  Confirm New Password
                </Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleChangePassword();
                    if (e.key === 'Escape') handleCancelChangePassword();
                  }}
                  className="h-9 bg-zinc-800 border-zinc-700 text-white focus-visible:ring-[#D4A017]"
                  placeholder="Repeat new password"
                  disabled={isPasswordPending}
                  autoComplete="new-password"
                />
                {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-400">Passwords do not match</p>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  className="h-8 px-4 text-xs bg-[#D4A017] text-black hover:bg-[#D4A017]/90 font-medium"
                  onClick={handleChangePassword}
                  disabled={isPasswordPending}
                >
                  {isPasswordPending ? 'Changing...' : 'Change Password'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-3 text-xs text-zinc-500 hover:text-zinc-300"
                  onClick={handleCancelChangePassword}
                  disabled={isPasswordPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Organization card */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base text-white">Organization</CardTitle>
          <CardDescription>Workspace overview</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <Field label="Members" value={String(profile.memberCount)} />
          <div>
            <p className="text-zinc-500 mb-1">Plan</p>
            <Badge variant="outline" className="border-[#D4A017] text-[#D4A017]">
              Active
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-zinc-500 mb-1">{label}</p>
      <p className={`font-medium text-zinc-100 ${mono ? 'font-mono text-xs' : ''}`}>
        {value || '--'}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Team tab
// ---------------------------------------------------------------------------

function TeamTab({ members }: { members: TeamMember[] }) {
  if (members.length === 0) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="py-10 text-center text-zinc-500 text-sm">
          No team members found.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-base text-white">Team Members</CardTitle>
        <CardDescription>{members.length} member{members.length !== 1 ? 's' : ''}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-zinc-800">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between px-6 py-3 gap-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-100 truncate">{m.name}</p>
                <p className="text-xs text-zinc-500 truncate">{m.email}</p>
              </div>
              <Badge
                variant="outline"
                className={`shrink-0 text-xs ${roleBadgeClass(m.roleName)}`}
              >
                {m.roleName}
              </Badge>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Pipeline tab
// ---------------------------------------------------------------------------

function PipelineTab({
  initialStages,
  pipelineId,
  canEdit,
}: {
  initialStages: StageRow[];
  pipelineId: string | null;
  canEdit: boolean;
}) {
  const [stages, setStages] = useState<StageRow[]>(initialStages);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [newStageName, setNewStageName] = useState('');
  const [isPending, startTransition] = useTransition();

  function beginEdit(stage: StageRow) {
    setEditingId(stage.id);
    setEditValue(stage.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue('');
  }

  function handleRename(stage: StageRow) {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === stage.name) {
      cancelEdit();
      return;
    }

    startTransition(async () => {
      const result = await renameStage(stage.id, trimmed);
      if (result.success) {
        setStages((prev) =>
          prev.map((s) => (s.id === stage.id ? { ...s, name: trimmed } : s))
        );
        setEditingId(null);
        toast.success('Stage renamed');
      } else {
        toast.error(result.error ?? 'Failed to rename stage');
      }
    });
  }

  function handleAdd() {
    const trimmed = newStageName.trim();
    if (!trimmed || !pipelineId) return;

    startTransition(async () => {
      const result = await addStage(pipelineId, trimmed);
      if (result.success) {
        setStages((prev) => [...prev, result.data]);
        setNewStageName('');
        toast.success('Stage added');
      } else {
        toast.error(result.error ?? 'Failed to add stage');
      }
    });
  }

  function handleReorder(stageId: string, direction: 'up' | 'down') {
    startTransition(async () => {
      const result = await reorderStage(stageId, direction);
      if (result.success) {
        // Re-sort locally by swapping positions
        setStages((prev) => {
          const idx = prev.findIndex((s) => s.id === stageId);
          const siblingIdx = direction === 'up' ? idx - 1 : idx + 1;
          if (siblingIdx < 0 || siblingIdx >= prev.length) return prev;

          const next = [...prev];
          const tmp = next[idx].position;
          next[idx] = { ...next[idx], position: next[siblingIdx].position };
          next[siblingIdx] = { ...next[siblingIdx], position: tmp };
          return next.sort((a, b) => a.position - b.position);
        });
      } else {
        toast.error(result.error ?? 'Failed to reorder stage');
      }
    });
  }

  if (stages.length === 0 && !pipelineId) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="py-10 text-center text-zinc-500 text-sm">
          No pipeline configured for this workspace.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base text-white">Pipeline Stages</CardTitle>
          <CardDescription>
            {canEdit
              ? 'Rename, reorder, or add stages'
              : 'View pipeline stages'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-zinc-800">
            {stages.map((stage, idx) => (
              <li
                key={stage.id}
                className="flex items-center gap-3 px-6 py-3"
              >
                {/* Position badge */}
                <span className="w-6 h-6 rounded-full bg-zinc-800 text-xs text-zinc-400 flex items-center justify-center shrink-0 font-mono">
                  {stage.position + 1}
                </span>

                {/* Name / edit field */}
                {editingId === stage.id ? (
                  <div className="flex flex-1 items-center gap-2 min-w-0">
                    <Input
                      className="h-7 text-sm bg-zinc-800 border-zinc-700 text-white"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(stage);
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      autoFocus
                      disabled={isPending}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-emerald-400 hover:text-emerald-300"
                      onClick={() => handleRename(stage)}
                      disabled={isPending}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-zinc-500 hover:text-zinc-300"
                      onClick={cancelEdit}
                      disabled={isPending}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <span className="flex-1 text-sm text-zinc-100 truncate">
                    {stage.name}
                  </span>
                )}

                {/* Actions */}
                {canEdit && editingId !== stage.id && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-zinc-500 hover:text-zinc-300 disabled:opacity-30"
                      onClick={() => handleReorder(stage.id, 'up')}
                      disabled={isPending || idx === 0}
                      aria-label="Move stage up"
                    >
                      ↑
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-zinc-500 hover:text-zinc-300 disabled:opacity-30"
                      onClick={() => handleReorder(stage.id, 'down')}
                      disabled={isPending || idx === stages.length - 1}
                      aria-label="Move stage down"
                    >
                      ↓
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-zinc-500 hover:text-[#D4A017]"
                      onClick={() => beginEdit(stage)}
                      disabled={isPending}
                    >
                      Rename
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {canEdit && pipelineId && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base text-white">Add Stage</CardTitle>
            <CardDescription>Append a new stage at the end of the pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Stage name..."
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600"
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd();
                }}
                disabled={isPending}
                maxLength={80}
              />
              <Button
                onClick={handleAdd}
                disabled={isPending || !newStageName.trim()}
                className="bg-[#D4A017] text-black hover:bg-[#D4A017]/90 font-medium shrink-0"
              >
                Add
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Template form (shared by create + edit)
// ---------------------------------------------------------------------------

interface TemplateFormState {
  name: string;
  subject: string;
  body: string;
  category: EmailTemplateCategory;
}

const EMPTY_FORM: TemplateFormState = {
  name: '',
  subject: '',
  body: '',
  category: 'follow_up',
};

function TemplateFormFields({
  form,
  onChange,
  disabled,
}: {
  form: TemplateFormState;
  onChange: (field: keyof TemplateFormState, value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-zinc-300 text-sm">Template Name</Label>
        <Input
          value={form.name}
          onChange={(e) => onChange('name', e.target.value)}
          placeholder="e.g. First Follow-Up Email"
          className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600"
          disabled={disabled}
          maxLength={120}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-zinc-300 text-sm">Subject Line</Label>
        <Input
          value={form.subject}
          onChange={(e) => onChange('subject', e.target.value)}
          placeholder="e.g. Quick check-in, {{contact_name}}"
          className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600"
          disabled={disabled}
          maxLength={255}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-zinc-300 text-sm">Category</Label>
        <Select
          value={form.category}
          onValueChange={(v) => onChange('category', v)}
          disabled={disabled}
        >
          <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            {ALL_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat} className="text-zinc-100 focus:bg-zinc-800">
                {CATEGORY_LABELS[cat]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-zinc-300 text-sm">Body</Label>
        <AiToolbar
          mode="email"
          disabled={disabled}
          getBody={() => (form.subject ? `Subject: ${form.subject}\n\n${form.body}` : form.body)}
          onSetEmail={(next) => {
            if (next.subject !== '__keep__') onChange('subject', next.subject);
            onChange('body', next.body);
          }}
        />
        <Textarea
          value={form.body}
          onChange={(e) => onChange('body', e.target.value)}
          placeholder="Write your email body here. Use placeholders below."
          className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-600 min-h-[160px] resize-y font-mono text-sm"
          disabled={disabled}
        />
        <div className="rounded-md bg-zinc-800/60 border border-zinc-700/60 px-3 py-2.5 space-y-1.5">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Available placeholders</p>
          <ul className="space-y-1">
            {PLACEHOLDER_TOKENS.map(({ token, description }) => (
              <li key={token} className="flex items-start gap-2 text-xs">
                <code className="font-mono text-[#D4A017] shrink-0">{token}</code>
                <span className="text-zinc-500">{description}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Templates tab
// ---------------------------------------------------------------------------

function TemplatesTab({
  initialTemplates,
  canEdit,
}: {
  initialTemplates: EmailTemplateRow[];
  canEdit: boolean;
}) {
  const [templates, setTemplates] = useState<EmailTemplateRow[]>(initialTemplates);
  const [isPending, startTransition] = useTransition();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplateRow | null>(null);
  const [form, setForm] = useState<TemplateFormState>(EMPTY_FORM);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<EmailTemplateRow | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Preview
  const [previewTarget, setPreviewTarget] = useState<EmailTemplateRow | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  function openCreate() {
    setEditingTemplate(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(t: EmailTemplateRow) {
    setEditingTemplate(t);
    setForm({
      name: t.name,
      subject: t.subject,
      body: t.body,
      category: t.category,
    });
    setDialogOpen(true);
  }

  function openPreview(t: EmailTemplateRow) {
    setPreviewTarget(t);
    setPreviewOpen(true);
  }

  function openDeleteConfirm(t: EmailTemplateRow) {
    setDeleteTarget(t);
    setDeleteDialogOpen(true);
  }

  function handleFormChange(field: keyof TemplateFormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSave() {
    const input: EmailTemplateInput = {
      name: form.name.trim(),
      subject: form.subject.trim(),
      body: form.body.trim(),
      category: form.category,
    };

    if (!input.name) { toast.error('Template name is required'); return; }
    if (!input.subject) { toast.error('Subject line is required'); return; }
    if (!input.body) { toast.error('Body is required'); return; }

    startTransition(async () => {
      if (editingTemplate) {
        const result = await updateEmailTemplate(editingTemplate.id, input);
        if (result.success) {
          setTemplates((prev) =>
            prev.map((t) => (t.id === editingTemplate.id ? result.data : t))
          );
          setDialogOpen(false);
          toast.success('Template updated');
        } else {
          toast.error(result.error ?? 'Failed to update template');
        }
      } else {
        const result = await createEmailTemplate(input);
        if (result.success) {
          setTemplates((prev) => [result.data, ...prev]);
          setDialogOpen(false);
          toast.success('Template created');
        } else {
          toast.error(result.error ?? 'Failed to create template');
        }
      }
    });
  }

  function handleDelete() {
    if (!deleteTarget) return;

    startTransition(async () => {
      const result = await deleteEmailTemplate(deleteTarget.id);
      if (result.success) {
        setTemplates((prev) => prev.filter((t) => t.id !== deleteTarget.id));
        setDeleteDialogOpen(false);
        setDeleteTarget(null);
        toast.success('Template deleted');
      } else {
        toast.error(result.error ?? 'Failed to delete template');
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-zinc-400">
            {templates.length} template{templates.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canEdit && (
          <Button
            onClick={openCreate}
            className="bg-[#D4A017] text-black hover:bg-[#D4A017]/90 font-medium"
            size="sm"
          >
            New Template
          </Button>
        )}
      </div>

      {/* Template list */}
      {templates.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-10 text-center text-zinc-500 text-sm">
            No email templates yet.{canEdit ? ' Create one to get started.' : ''}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-0">
            <ul className="divide-y divide-zinc-800">
              {templates.map((t) => (
                <li key={t.id} className="flex items-start justify-between gap-4 px-6 py-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm font-medium text-zinc-100 truncate">{t.name}</p>
                    <p className="text-xs text-zinc-500 truncate">{t.subject}</p>
                    <Badge
                      variant="outline"
                      className={`text-xs ${CATEGORY_COLORS[t.category]}`}
                    >
                      {CATEGORY_LABELS[t.category]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 pt-0.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-zinc-500 hover:text-zinc-300 text-xs"
                      onClick={() => openPreview(t)}
                    >
                      Preview
                    </Button>
                    {canEdit && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-zinc-500 hover:text-[#D4A017] text-xs"
                          onClick={() => openEdit(t)}
                          disabled={isPending}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-zinc-500 hover:text-red-400 text-xs"
                          onClick={() => openDeleteConfirm(t)}
                          disabled={isPending}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingTemplate ? 'Edit Template' : 'New Email Template'}
            </DialogTitle>
          </DialogHeader>

          <TemplateFormFields
            form={form}
            onChange={handleFormChange}
            disabled={isPending}
          />

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="ghost"
              className="text-zinc-400 hover:text-zinc-200"
              onClick={() => setDialogOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isPending}
              className="bg-[#D4A017] text-black hover:bg-[#D4A017]/90 font-medium"
            >
              {isPending ? 'Saving...' : editingTemplate ? 'Save Changes' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Template</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-400">
            Are you sure you want to delete{' '}
            <span className="font-medium text-zinc-200">{deleteTarget?.name}</span>?
            This cannot be undone and will remove it from any sequences that reference it.
          </p>
          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="ghost"
              className="text-zinc-400 hover:text-zinc-200"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isPending}
              className="bg-red-600 text-white hover:bg-red-700 font-medium"
            >
              {isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="bg-zinc-950 border-zinc-800 max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">{previewTarget?.name}</DialogTitle>
          </DialogHeader>
          {previewTarget && (
            <div className="space-y-3">
              <div className="rounded-md bg-zinc-900 border border-zinc-800 px-4 py-3 space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-500 w-14 shrink-0">Subject</span>
                  <span className="text-zinc-100 font-medium">{previewTarget.subject}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-500 w-14 shrink-0">Category</span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${CATEGORY_COLORS[previewTarget.category]}`}
                  >
                    {CATEGORY_LABELS[previewTarget.category]}
                  </Badge>
                </div>
              </div>
              <div className="rounded-md bg-zinc-900 border border-zinc-800 px-4 py-3">
                <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed">
                  {previewTarget.body}
                </pre>
              </div>
              <div className="rounded-md bg-zinc-800/60 border border-zinc-700/60 px-3 py-2 text-xs text-zinc-500">
                Placeholders like{' '}
                <code className="font-mono text-[#D4A017]">{'{{contact_name}}'}</code>{' '}
                will be replaced with real values when the email is sent.
              </div>
            </div>
          )}
          <DialogFooter className="pt-2">
            <Button
              variant="ghost"
              className="text-zinc-400 hover:text-zinc-200"
              onClick={() => setPreviewOpen(false)}
            >
              Close
            </Button>
            {canEdit && previewTarget && (
              <Button
                onClick={() => {
                  setPreviewOpen(false);
                  openEdit(previewTarget);
                }}
                className="bg-[#D4A017] text-black hover:bg-[#D4A017]/90 font-medium"
              >
                Edit
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Activity Log tab
// ---------------------------------------------------------------------------

const ACTION_LABELS: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  login: 'Logged in',
  export: 'Exported',
  import: 'Imported',
};

const ACTION_COLORS: Record<string, string> = {
  create: 'border-emerald-500 text-emerald-400',
  update: 'border-sky-500 text-sky-400',
  delete: 'border-red-500 text-red-400',
  login: 'border-violet-500 text-violet-400',
  export: 'border-orange-400 text-orange-300',
  import: 'border-[#D4A017] text-[#D4A017]',
};

const ACTION_DOT_COLORS: Record<string, string> = {
  create: 'bg-emerald-500',
  update: 'bg-sky-500',
  delete: 'bg-red-500',
  login: 'bg-violet-500',
  export: 'bg-orange-400',
  import: 'bg-[#D4A017]',
};

const ALL_AUDIT_ACTIONS = ['create', 'update', 'delete', 'login', 'export', 'import'] as const;
type FilterAction = (typeof ALL_AUDIT_ACTIONS)[number] | 'all';

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function formatAbsoluteTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildDescription(log: AuditLogRow): string {
  const entity = log.entity
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const actionLabel = ACTION_LABELS[log.action] ?? log.action;
  let desc = `${actionLabel} ${entity}`;
  if (log.entityId) {
    desc += ` (${log.entityId.slice(0, 8)})`;
  }
  // Pull a name from metadata if available
  const meta = log.metadata;
  if (meta && typeof meta === 'object') {
    const name = (meta as Record<string, unknown>).name ?? (meta as Record<string, unknown>).title;
    if (typeof name === 'string' && name) {
      desc = `${actionLabel} ${entity}: ${name}`;
    }
  }
  return desc;
}

function ActivityLogTab({ initialLogs }: { initialLogs: AuditLogRow[] }) {
  const [filter, setFilter] = useState<FilterAction>('all');

  const visible = filter === 'all'
    ? initialLogs
    : initialLogs.filter((l) => l.action === filter);

  return (
    <div className="space-y-4">
      {/* Header + filter */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-400">
          Last {initialLogs.length} actions in this workspace
        </p>
        <Select
          value={filter}
          onValueChange={(v) => setFilter(v as FilterAction)}
        >
          <SelectTrigger className="w-40 h-8 text-xs bg-zinc-800 border-zinc-700 text-white">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-700">
            <SelectItem value="all" className="text-zinc-100 text-xs focus:bg-zinc-800">
              All actions
            </SelectItem>
            {ALL_AUDIT_ACTIONS.map((a) => (
              <SelectItem
                key={a}
                value={a}
                className="text-zinc-100 text-xs focus:bg-zinc-800"
              >
                {ACTION_LABELS[a]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Timeline */}
      {visible.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-10 text-center text-zinc-500 text-sm">
            {filter === 'all'
              ? 'No activity recorded yet.'
              : `No "${ACTION_LABELS[filter]}" events found.`}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-0">
            <ul className="divide-y divide-zinc-800">
              {visible.map((log) => {
                const dotColor = ACTION_DOT_COLORS[log.action] ?? 'bg-zinc-500';
                const badgeClass = ACTION_COLORS[log.action] ?? 'border-zinc-500 text-zinc-400';
                const description = buildDescription(log);
                const actor = log.userName ?? log.userEmail ?? 'System';

                return (
                  <li key={log.id} className="flex items-start gap-4 px-6 py-4">
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center pt-1 shrink-0">
                      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-sm text-zinc-100 leading-snug">{description}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`text-xs shrink-0 ${badgeClass}`}
                        >
                          {ACTION_LABELS[log.action] ?? log.action}
                        </Badge>
                        <span className="text-xs text-zinc-500 truncate">{actor}</span>
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div
                      className="shrink-0 text-xs text-zinc-500 pt-0.5 text-right whitespace-nowrap"
                      title={formatAbsoluteTime(log.createdAt)}
                    >
                      {formatRelativeTime(log.createdAt)}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Billing tab stub -- full page lives at /settings/billing
// ---------------------------------------------------------------------------

function BillingTabLink() {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 px-6 py-10 text-center space-y-3">
      <p className="text-zinc-300 text-sm font-medium">Plan & Billing</p>
      <p className="text-zinc-500 text-xs">Manage your subscription, view usage, and upgrade your plan.</p>
      <Link
        href="/settings/billing"
        className="inline-flex items-center gap-1.5 rounded-md bg-[#D4A017] hover:bg-[#D4A017]/90 px-4 py-2 text-sm font-semibold text-black transition-colors"
      >
        Open Billing
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root export
// ---------------------------------------------------------------------------

export function SettingsClient({
  profile,
  initialMembers,
  initialStages,
  pipelineId,
  initialTemplates,
  initialAuditLogs,
}: Props) {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Manage your workspace configuration
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <ProfileTab profile={profile} />
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <TeamTab members={initialMembers} />
        </TabsContent>

        <TabsContent value="pipeline" className="mt-4">
          <PipelineTab
            initialStages={initialStages}
            pipelineId={pipelineId}
            canEdit={profile.canEdit}
          />
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <TemplatesTab
            initialTemplates={initialTemplates}
            canEdit={profile.canEdit}
          />
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <ActivityLogTab initialLogs={initialAuditLogs} />
        </TabsContent>

        <TabsContent value="billing" className="mt-4">
          <BillingTabLink />
        </TabsContent>
      </Tabs>

      <IntegrationsGrid />
    </div>
  );
}

function IntegrationsGrid() {
  const items: Array<{ href: string; title: string; description: string }> = [
    {
      href: '/settings/twilio',
      title: 'Twilio · SMS + voice',
      description: 'Account SID, auth token, phone numbers. A2P 10DLC registration.',
    },
    {
      href: '/settings/quickbooks',
      title: 'QuickBooks Online',
      description: 'Connect your books. Hourly sync of invoices and payments.',
    },
    {
      href: '/settings/idx',
      title: 'IDX listings',
      description: 'Vendor picker and embed hints for your site pages.',
    },
    {
      href: '/settings/pipelines',
      title: 'Pipeline templates',
      description: 'Install Mortgage, Insurance, or Investment pipelines alongside Real Estate.',
    },
    {
      href: '/settings/alerts',
      title: 'Financial alerts',
      description: 'Thresholds for revenue drop, AR aging, overdue invoices, large payments.',
    },
    {
      href: '/settings/billing',
      title: 'Billing',
      description: 'Plan, subscription, usage. Stripe-backed.',
    },
  ];
  return (
    <div className="pt-4">
      <h2 className="text-sm font-semibold text-white">Integrations & advanced</h2>
      <p className="mt-1 text-xs text-zinc-500">
        Everything that lives at its own URL. Click through to configure.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className="block rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 transition-colors hover:border-[#D4A017]/60"
          >
            <div className="text-sm font-medium text-zinc-100">{it.title}</div>
            <p className="mt-1 text-xs text-zinc-500">{it.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
