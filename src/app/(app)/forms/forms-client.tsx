'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Trash2, ClipboardCopy, Check, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { createForm, deleteForm } from './actions';

interface FormRow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  submissionCount: number;
  fieldCount: number;
}

interface Props {
  forms: FormRow[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function buildEmbedSnippet(formId: string, origin: string): string {
  const endpoint = `${origin}/api/forms/${formId}/submit`;
  return `<!-- VIBE lead-capture form -- paste anywhere on your site -->
<form action="${endpoint}" method="POST" style="max-width:420px;font-family:system-ui,sans-serif">
  <div style="margin-bottom:12px">
    <label style="display:block;font-size:13px;margin-bottom:4px;color:#333">Name</label>
    <input type="text" name="name" required style="width:100%;padding:10px;border:1px solid #ccc;border-radius:6px;font-size:14px" />
  </div>
  <div style="margin-bottom:12px">
    <label style="display:block;font-size:13px;margin-bottom:4px;color:#333">Email</label>
    <input type="email" name="email" required style="width:100%;padding:10px;border:1px solid #ccc;border-radius:6px;font-size:14px" />
  </div>
  <div style="margin-bottom:12px">
    <label style="display:block;font-size:13px;margin-bottom:4px;color:#333">Phone</label>
    <input type="tel" name="phone" style="width:100%;padding:10px;border:1px solid #ccc;border-radius:6px;font-size:14px" />
  </div>
  <div style="margin-bottom:16px">
    <label style="display:block;font-size:13px;margin-bottom:4px;color:#333">Message</label>
    <textarea name="message" rows="4" style="width:100%;padding:10px;border:1px solid #ccc;border-radius:6px;font-size:14px;resize:vertical"></textarea>
  </div>
  <!-- honeypot: anti-spam, leave hidden and empty -->
  <input type="text" name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true" />
  <button type="submit" style="width:100%;padding:12px;background:#D4A017;color:#0A0A0F;border:0;border-radius:6px;font-weight:600;font-size:15px;cursor:pointer">
    Send
  </button>
</form>`;
}

function CopyEmbedButton({ formId }: { formId: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const snippet = buildEmbedSnippet(formId, origin);
    void navigator.clipboard.writeText(snippet).then(() => {
      setCopied(true);
      toast.success('HTML snippet copied -- paste into any website');
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-muted-foreground hover:text-foreground"
      onClick={(e) => {
        e.stopPropagation();
        handleCopy();
      }}
      title="Copy embeddable HTML snippet"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-400" />
      ) : (
        <ClipboardCopy className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}

function CopyHostedUrlButton({ formId }: { formId: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/s/${formId}`;
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      toast.success('Hosted URL copied -- share it anywhere');
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-muted-foreground hover:text-foreground"
      onClick={(e) => {
        e.stopPropagation();
        handleCopy();
      }}
      title="Copy the hosted form URL (no embed needed)"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-400" />
      ) : (
        <ExternalLink className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}

function DeleteFormButton({ formId, formName }: { formId: string; formName: string }) {
  const router = useRouter();
  const [pending, startDelete] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleDeleteConfirmed() {
    startDelete(async () => {
      const result = await deleteForm(formId);
      if (!result.success) {
        toast.error(result.error ?? 'Failed to delete form');
        return; // keep modal open so user knows it didn't work
      }
      toast.success(`"${formName}" deleted`);
      setConfirmOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-muted-foreground hover:text-destructive"
        onClick={(e) => {
          e.stopPropagation();
          setConfirmOpen(true);
        }}
        disabled={pending}
        title="Delete form"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Delete Form</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete &quot;{formName}&quot;? This will permanently
            remove the form and all its submissions. This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirmed}
              disabled={pending}
            >
              {pending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function FormsClient({ forms }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [creating, startCreate] = useTransition();
  const [createError, setCreateError] = useState<string | null>(null);

  const filtered = forms.filter(
    (f) =>
      search === '' || f.name.toLowerCase().includes(search.toLowerCase())
  );

  function handleCreate() {
    const trimmed = formName.trim();
    if (!trimmed) {
      setCreateError('Form name is required.');
      return;
    }
    setCreateError(null);
    startCreate(async () => {
      const result = await createForm(trimmed);
      if (result.success) {
        setFormName('');
        setDialogOpen(false);
        router.refresh();
      } else {
        setCreateError(result.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Forms</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {forms.length} form{forms.length !== 1 ? 's' : ''}
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setFormName('');
            setCreateError(null);
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-[#D4A017] text-black hover:bg-[#D4A017]/90 font-semibold">
              + New Form
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Create Form</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="form-name">
                  Form Name
                </label>
                <Input
                  id="form-name"
                  placeholder="e.g. Contact Us, Lead Capture"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate();
                  }}
                  autoFocus
                />
                {createError && (
                  <p className="text-xs text-destructive">{createError}</p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Default fields (First Name, Last Name, Email, Phone, Message) will be
                added automatically.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-[#D4A017] text-black hover:bg-[#D4A017]/90 font-semibold"
                  onClick={handleCreate}
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create Form'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div>
        <Input
          placeholder="Search forms..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Fields</TableHead>
              <TableHead className="text-right">Submissions</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-10 text-muted-foreground"
                >
                  {search
                    ? 'No forms match your search.'
                    : 'No forms yet. Create your first one.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((form) => (
                <TableRow
                  key={form.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => router.push(`/forms/${form.id}`)}
                >
                  <TableCell className="font-medium text-foreground">
                    {form.name}
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {form.fieldCount}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {form.submissionCount}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(form.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-0.5">
                      <CopyHostedUrlButton formId={form.id} />
                      <CopyEmbedButton formId={form.id} />
                      <DeleteFormButton formId={form.id} formName={form.name} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
