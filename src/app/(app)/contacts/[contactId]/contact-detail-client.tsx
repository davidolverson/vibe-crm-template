'use client';

import {
  useState,
  useTransition,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Pencil,
  Trash2,
  FileText,
  Phone,
  MessageSquare,
  Mail,
  GitBranch,
  CheckSquare,
  ClipboardList,
  Activity as ActivityIcon,
  Plus,
  X,
  TrendingUp,
  ListTodo,
  Calendar,
  CircleDollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  ContactForm,
  STATUS_LABELS,
  STATUS_BADGE_CLASS,
} from '@/components/contacts/contact-form';
import { updateContact, deleteContact } from '../actions';
import { createNote, addTag, removeTag, listTenantTags } from './actions';
import { SmsComposer } from '@/components/contacts/sms-composer';
import { updateTaskStatus } from '../../tasks/actions';
import type { ContactStatus, ActivityType, DealStatus, TaskStatus } from '@/generated/prisma/enums';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Activity {
  id: string;
  type: ActivityType;
  body: string | null;
  createdAt: string;
}

interface ContactTag {
  id: string;
  tag: string;
}

interface ContactDeal {
  id: string;
  name: string;
  value: string | null;
  status: DealStatus;
  stageName: string;
  createdAt: string;
}

interface ContactTask {
  id: string;
  title: string;
  priority: string;
  status: TaskStatus;
  dueAt: string | null;
  createdAt: string;
}

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  smsOptOut: boolean;
  company: string | null;
  status: ContactStatus;
  source: string | null;
  createdAt: string;
  activities: Activity[];
  tags: ContactTag[];
  deals: ContactDeal[];
  tasks: ContactTask[];
}

interface Props {
  contact: Contact;
}

// ---------------------------------------------------------------------------
// Activity type metadata
// ---------------------------------------------------------------------------

interface ActivityMeta {
  label: string;
  Icon: React.ElementType;
  iconClass: string;
}

const ACTIVITY_META: Record<string, ActivityMeta> = {
  note: {
    label: 'Note',
    Icon: FileText,
    iconClass: 'text-sky-400',
  },
  call: {
    label: 'Call',
    Icon: Phone,
    iconClass: 'text-emerald-400',
  },
  sms: {
    label: 'SMS',
    Icon: MessageSquare,
    iconClass: 'text-violet-400',
  },
  email: {
    label: 'Email',
    Icon: Mail,
    iconClass: 'text-amber-400',
  },
  stage_change: {
    label: 'Stage Changed',
    Icon: GitBranch,
    iconClass: 'text-pink-400',
  },
  task_completed: {
    label: 'Task Completed',
    Icon: CheckSquare,
    iconClass: 'text-teal-400',
  },
  form_submission: {
    label: 'Form Submitted',
    Icon: ClipboardList,
    iconClass: 'text-orange-400',
  },
};

function getActivityMeta(type: string): ActivityMeta {
  return (
    ACTIVITY_META[type] ?? {
      label: type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      Icon: ActivityIcon,
      iconClass: 'text-muted-foreground',
    }
  );
}

// ---------------------------------------------------------------------------
// Relative time formatter
// ---------------------------------------------------------------------------

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Deal status helpers
// ---------------------------------------------------------------------------

const DEAL_STATUS_CONFIG: Record<DealStatus, { label: string; className: string }> = {
  open:  { label: 'Open',  className: 'bg-sky-900/50 text-sky-300 border-sky-700/50' },
  won:   { label: 'Won',   className: 'bg-emerald-900/50 text-emerald-300 border-emerald-700/50' },
  lost:  { label: 'Lost',  className: 'bg-rose-900/50 text-rose-300 border-rose-700/50' },
};

function formatCurrency(value: string | null): string {
  if (!value) return '-';
  const num = parseFloat(value);
  if (isNaN(num)) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(num);
}

// ---------------------------------------------------------------------------
// Task priority / status helpers
// ---------------------------------------------------------------------------

type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; className: string }> = {
  low:    { label: 'Low',    className: 'bg-muted text-muted-foreground border-muted-foreground/20' },
  medium: { label: 'Medium', className: 'bg-blue-900/30 text-blue-400 border-blue-700/30' },
  high:   { label: 'High',   className: 'bg-amber-900/30 text-amber-400 border-amber-700/30' },
  urgent: { label: 'Urgent', className: 'bg-red-900/30 text-red-400 border-red-700/30' },
};

const TASK_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending:   { label: 'Pending',   className: 'bg-muted text-muted-foreground border-muted-foreground/20' },
  completed: { label: 'Completed', className: 'bg-emerald-900/40 text-emerald-300 border-emerald-700/40' },
  cancelled: { label: 'Cancelled', className: 'bg-zinc-800 text-zinc-400 border-zinc-700' },
};

function isTaskOverdue(task: ContactTask): boolean {
  return (
    task.status === 'pending' &&
    task.dueAt !== null &&
    new Date(task.dueAt) < new Date()
  );
}

// ---------------------------------------------------------------------------
// Tag color palette (hash-based, dark-theme safe)
// ---------------------------------------------------------------------------

const TAG_PALETTE: { bg: string; text: string; ring: string }[] = [
  { bg: 'bg-sky-900/60',     text: 'text-sky-300',     ring: 'ring-sky-700/50' },
  { bg: 'bg-violet-900/60',  text: 'text-violet-300',  ring: 'ring-violet-700/50' },
  { bg: 'bg-emerald-900/60', text: 'text-emerald-300', ring: 'ring-emerald-700/50' },
  { bg: 'bg-amber-900/60',   text: 'text-amber-300',   ring: 'ring-amber-700/50' },
  { bg: 'bg-pink-900/60',    text: 'text-pink-300',    ring: 'ring-pink-700/50' },
  { bg: 'bg-teal-900/60',    text: 'text-teal-300',    ring: 'ring-teal-700/50' },
  { bg: 'bg-orange-900/60',  text: 'text-orange-300',  ring: 'ring-orange-700/50' },
  { bg: 'bg-indigo-900/60',  text: 'text-indigo-300',  ring: 'ring-indigo-700/50' },
  { bg: 'bg-rose-900/60',    text: 'text-rose-300',    ring: 'ring-rose-700/50' },
  { bg: 'bg-cyan-900/60',    text: 'text-cyan-300',    ring: 'ring-cyan-700/50' },
];

function tagColor(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = (hash * 31 + tag.charCodeAt(i)) >>> 0;
  }
  return TAG_PALETTE[hash % TAG_PALETTE.length];
}

// ---------------------------------------------------------------------------
// TagManager sub-component
// ---------------------------------------------------------------------------

interface TagManagerProps {
  contactId: string;
  initialTags: ContactTag[];
}

function TagManager({ contactId, initialTags }: TagManagerProps) {
  const [tags, setTags] = useState<ContactTag[]>(initialTags);
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isAdding, startAddTransition] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLUListElement>(null);

  // Debounced autocomplete fetch
  const fetchSuggestions = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const result = await listTenantTags(query);
      if (result.success) {
        // Filter out tags already applied to this contact
        const applied = new Set(tags.map((t) => t.tag));
        setSuggestions(result.data.filter((s) => !applied.has(s)));
        setShowSuggestions(true);
      }
    }, 250);
  }, [tags]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Close suggestions on outside click
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setInput(val);
    if (val.trim()) {
      fetchSuggestions(val.trim());
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }

  function commitTag(tag: string) {
    const cleaned = tag.trim().toLowerCase();
    if (!cleaned || cleaned.length > 64) return;
    // Optimistic: check for duplicate
    if (tags.some((t) => t.tag === cleaned)) {
      toast.error('Tag already applied.');
      setInput('');
      setShowSuggestions(false);
      return;
    }

    const optimisticId = `optimistic-${Date.now()}`;
    const optimistic: ContactTag = { id: optimisticId, tag: cleaned };
    setTags((prev) => [...prev, optimistic]);
    setInput('');
    setShowSuggestions(false);

    startAddTransition(async () => {
      const result = await addTag(contactId, cleaned);
      if (result.success) {
        // Replace optimistic entry with real ID
        setTags((prev) =>
          prev.map((t) =>
            t.id === optimisticId
              ? { id: result.data.id, tag: result.data.tag }
              : t
          )
        );
      } else {
        // Roll back
        setTags((prev) => prev.filter((t) => t.id !== optimisticId));
        toast.error(result.error ?? 'Failed to add tag.');
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitTag(input);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  }

  function handleRemove(tagId: string) {
    if (removingId) return;
    const previous = tags;
    setRemovingId(tagId);
    setTags((prev) => prev.filter((t) => t.id !== tagId));

    removeTag(contactId, tagId).then((result) => {
      setRemovingId(null);
      if (!result.success) {
        setTags(previous);
        toast.error(result.error ?? 'Failed to remove tag.');
      }
    });
  }

  return (
    <div className="space-y-3">
      {/* Existing tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((ct) => {
            const color = tagColor(ct.tag);
            const isRemoving = removingId === ct.id;
            return (
              <span
                key={ct.id}
                className={`
                  inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium
                  ring-1 transition-opacity
                  ${color.bg} ${color.text} ${color.ring}
                  ${isRemoving ? 'opacity-40' : 'opacity-100'}
                `}
              >
                {ct.tag}
                <button
                  type="button"
                  aria-label={`Remove tag ${ct.tag}`}
                  disabled={isRemoving || isAdding}
                  onClick={() => handleRemove(ct.id)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-white/10 disabled:cursor-not-allowed transition-colors"
                >
                  <X className="size-2.5" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Add tag input */}
      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (input.trim()) fetchSuggestions(input.trim());
            }}
            placeholder="Add a tag..."
            maxLength={64}
            disabled={isAdding}
            className="h-8 text-sm bg-background pr-3 disabled:opacity-50"
            aria-label="New tag"
            aria-autocomplete="list"
            aria-expanded={showSuggestions}
          />

          {/* Autocomplete dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <ul
              ref={suggestionsRef}
              role="listbox"
              className="absolute z-50 top-full mt-1 w-full rounded-md border border-border bg-popover py-1 shadow-lg"
            >
              {suggestions.map((s) => {
                const color = tagColor(s);
                return (
                  <li key={s} role="option" aria-selected={false}>
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-muted/60 transition-colors text-left"
                      onPointerDown={(e) => {
                        // Use pointerdown so the input blur doesn't close it first
                        e.preventDefault();
                        commitTag(s);
                      }}
                    >
                      <span
                        className={`
                          inline-block size-2 rounded-full
                          ${color.bg.replace('/60', '')}
                        `}
                      />
                      {s}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <Button
          size="sm"
          variant="outline"
          className="h-8 px-3 shrink-0"
          disabled={!input.trim() || isAdding}
          onClick={() => commitTag(input)}
          aria-label="Add tag"
        >
          <Plus className="size-3.5 mr-1" />
          Add
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ContactDetailClient({ contact }: Props) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();

  // Add Note state
  const [noteBody, setNoteBody] = useState('');
  const [isSubmittingNote, startNoteTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Tasks local state (optimistic status toggling)
  const [tasks, setTasks] = useState<ContactTask[]>(contact.tasks);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [, startTaskTransition] = useTransition();

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteContact(contact.id);
      if (result.success) {
        toast.success('Contact deleted.');
        router.push('/contacts');
      } else {
        toast.error(result.error ?? 'Failed to delete contact.');
        setDeleteOpen(false);
      }
    });
  }

  function handleAddNote() {
    if (!noteBody.trim()) return;
    startNoteTransition(async () => {
      const result = await createNote(contact.id, noteBody);
      if (result.success) {
        toast.success('Note added.');
        setNoteBody('');
        textareaRef.current?.focus();
      } else {
        toast.error(result.error ?? 'Failed to add note.');
      }
    });
  }

  function handleToggleTask(taskId: string, currentStatus: TaskStatus) {
    if (pendingTaskId) return;
    const nextStatus: 'pending' | 'completed' =
      currentStatus === 'completed' ? 'pending' : 'completed';

    // Optimistic update
    setPendingTaskId(taskId);
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: nextStatus as TaskStatus } : t
      )
    );

    startTaskTransition(async () => {
      const result = await updateTaskStatus(taskId, nextStatus);
      if (!result.success) {
        // Roll back
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, status: currentStatus } : t
          )
        );
        toast.error(result.error ?? 'Failed to update task.');
      }
      setPendingTaskId(null);
    });
  }

  const charCount = noteBody.length;
  const charLimit = 5000;
  const overLimit = charCount > charLimit;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back nav */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/contacts')}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4 mr-1" />
          Back
        </Button>
      </div>

      {/* Contact card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <CardTitle className="text-xl">{contact.name}</CardTitle>
              <Badge
                variant="outline"
                className={STATUS_BADGE_CLASS[contact.status]}
              >
                {STATUS_LABELS[contact.status]}
              </Badge>

              {/* Tags section */}
              <div className="pt-1">
                <TagManager
                  contactId={contact.id}
                  initialTags={contact.tags}
                />
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
              {/* Edit dialog */}
              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Pencil className="size-4 mr-1" />
                    Edit
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Edit Contact</DialogTitle>
                  </DialogHeader>
                  <ContactForm
                    defaultValues={{
                      name: contact.name,
                      email: contact.email ?? undefined,
                      phone: contact.phone ?? undefined,
                      company: contact.company ?? undefined,
                      status: contact.status,
                      source: contact.source ?? undefined,
                    }}
                    onSubmit={(formData) => updateContact(contact.id, formData)}
                    onSuccess={() => setEditOpen(false)}
                    submitLabel="Save Changes"
                  />
                </DialogContent>
              </Dialog>

              {/* Delete dialog */}
              <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive/40 hover:bg-destructive/10"
                  >
                    <Trash2 className="size-4 mr-1" />
                    Delete
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Delete Contact</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-muted-foreground">
                    Are you sure you want to delete{' '}
                    <span className="font-medium text-foreground">
                      {contact.name}
                    </span>
                    ? This cannot be undone.
                  </p>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteOpen(false)}
                      disabled={isDeleting}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow label="Email" value={contact.email} />
          <div className="flex items-start justify-between gap-2">
            <InfoRow label="Phone" value={contact.phone} />
            {contact.phone && (
              <SmsComposer
                contactId={contact.id}
                contactName={contact.name}
                phone={contact.phone}
                optedOut={contact.smsOptOut}
              />
            )}
          </div>
          <InfoRow label="Company" value={contact.company} />
          <InfoRow label="Source" value={contact.source} />
          <InfoRow label="Created" value={formatDate(contact.createdAt)} />
        </CardContent>
      </Card>

      {/* Activity timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {contact.activities.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No activity recorded yet.
            </p>
          ) : (
            <ul className="space-y-0">
              {contact.activities.map((activity, idx) => {
                const meta = getActivityMeta(activity.type);
                const { Icon, iconClass, label } = meta;
                const isLast = idx === contact.activities.length - 1;

                return (
                  <li key={activity.id} className="flex gap-3">
                    {/* Timeline spine */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted ${iconClass}`}
                      >
                        <Icon className="size-3.5" />
                      </div>
                      {!isLast && (
                        <div className="w-px flex-1 bg-border my-1" />
                      )}
                    </div>

                    {/* Content */}
                    <div className={`min-w-0 pb-4 ${isLast ? '' : ''}`}>
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(activity.createdAt)}
                        </span>
                      </div>
                      {activity.body && (
                        <p className="mt-0.5 text-sm text-muted-foreground whitespace-pre-wrap break-words">
                          {activity.body}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Deals section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="size-4 text-emerald-400" />
              Deals
              {contact.deals.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  ({contact.deals.length})
                </span>
              )}
            </CardTitle>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs"
            >
              <Link href={`/pipeline?contactId=${contact.id}`}>
                <Plus className="size-3 mr-1" />
                Add Deal
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {contact.deals.length === 0 ? (
            <p className="text-sm text-muted-foreground py-3 text-center">
              No deals yet.
            </p>
          ) : (
            <ul className="space-y-0">
              {contact.deals.map((deal) => {
                const statusCfg = DEAL_STATUS_CONFIG[deal.status];
                return (
                  <li
                    key={deal.id}
                    className="flex items-center justify-between gap-3 py-3 border-b border-border last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/pipeline/${deal.id}`}
                        className="text-sm font-medium text-foreground hover:text-primary hover:underline truncate block"
                      >
                        {deal.name}
                      </Link>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CircleDollarSign className="size-3" />
                          {formatCurrency(deal.value)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {deal.stageName}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium shrink-0 ${statusCfg.className}`}
                    >
                      {statusCfg.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Tasks section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ListTodo className="size-4 text-violet-400" />
              Tasks
              {tasks.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  ({tasks.length})
                </span>
              )}
            </CardTitle>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs"
            >
              <Link href={`/tasks?contactId=${contact.id}`}>
                <Plus className="size-3 mr-1" />
                Add Task
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-3 text-center">
              No tasks yet.
            </p>
          ) : (
            <ul className="space-y-0">
              {tasks.map((task) => {
                const overdue = isTaskOverdue(task);
                const priorityKey = (task.priority ?? 'medium') as TaskPriority;
                const priorityCfg = PRIORITY_CONFIG[priorityKey] ?? PRIORITY_CONFIG.medium;
                const statusCfg = TASK_STATUS_CONFIG[task.status] ?? TASK_STATUS_CONFIG.pending;
                const isPending = pendingTaskId === task.id;

                return (
                  <li
                    key={task.id}
                    className={`flex items-start justify-between gap-3 py-3 border-b border-border last:border-0 ${
                      overdue ? 'bg-destructive/5 -mx-4 px-4 rounded' : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-medium truncate ${
                          overdue ? 'text-destructive' : 'text-foreground'
                        }`}
                      >
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {task.dueAt && (
                          <span
                            className={`flex items-center gap-1 text-xs ${
                              overdue
                                ? 'text-destructive font-medium'
                                : 'text-muted-foreground'
                            }`}
                          >
                            <Calendar className="size-3" />
                            {new Date(task.dueAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                            {overdue && ' (overdue)'}
                          </span>
                        )}
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${priorityCfg.className}`}
                        >
                          {priorityCfg.label}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusCfg.className}`}
                      >
                        {statusCfg.label}
                      </span>
                      {task.status !== 'cancelled' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs h-7 px-2 shrink-0"
                          disabled={isPending || pendingTaskId !== null}
                          onClick={() =>
                            handleToggleTask(task.id, task.status)
                          }
                        >
                          {isPending
                            ? '...'
                            : task.status === 'completed'
                            ? 'Reopen'
                            : 'Complete'}
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Add Note */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="size-4" />
            Add Note
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            ref={textareaRef}
            placeholder="Write a note about this contact..."
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            disabled={isSubmittingNote}
            rows={4}
            className="resize-none bg-background text-sm placeholder:text-muted-foreground focus-visible:ring-1 disabled:opacity-50"
            aria-label="Note body"
          />
          <div className="flex items-center justify-between">
            <span
              className={`text-xs ${
                overLimit ? 'text-destructive' : 'text-muted-foreground'
              }`}
            >
              {charCount} / {charLimit.toLocaleString()}
            </span>
            <Button
              size="sm"
              onClick={handleAddNote}
              disabled={isSubmittingNote || !noteBody.trim() || overLimit}
            >
              {isSubmittingNote ? 'Saving...' : 'Save Note'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// InfoRow helper
// ---------------------------------------------------------------------------

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <p className="text-sm text-foreground mt-0.5">{value ?? '-'}</p>
    </div>
  );
}

