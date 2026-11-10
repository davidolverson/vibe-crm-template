'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Pencil,
  GitBranch,
  TrendingUp,
  FileText,
  Activity as ActivityIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { updateDeal, closeDeal } from '../actions';
import type { DealEditFields } from '../actions';
import type { DealStatus } from '@/generated/prisma/enums';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DealActivity {
  id: string;
  type: string;
  description: string;
  createdAt: string;
}

interface Deal {
  id: string;
  name: string;
  value: number | null;
  status: DealStatus;
  lostReason: string | null;
  expectedCloseDate: string | null;
  closedAt: string | null;
  stageChangedAt: string;
  createdAt: string;
  updatedAt: string;
  stage: {
    id: string;
    name: string;
    pipelineId: string;
    pipelineName: string;
  };
  contact: {
    id: string;
    name: string;
    email: string | null;
  };
  activities: DealActivity[];
}

interface Props {
  deal: Deal;
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

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

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const STATUS_BADGE: Record<DealStatus, { label: string; className: string }> = {
  open: {
    label: 'Open',
    className: 'border-sky-700/60 bg-sky-900/40 text-sky-300',
  },
  won: {
    label: 'Won',
    className: 'border-emerald-700/60 bg-emerald-900/40 text-emerald-300',
  },
  lost: {
    label: 'Lost',
    className: 'border-red-700/60 bg-red-900/40 text-red-300',
  },
};

// ---------------------------------------------------------------------------
// Activity timeline icon mapping
// ---------------------------------------------------------------------------

interface ActivityMeta {
  label: string;
  Icon: React.ElementType;
  iconClass: string;
}

const ACTIVITY_META: Record<string, ActivityMeta> = {
  stage_change: {
    label: 'Stage Changed',
    Icon: GitBranch,
    iconClass: 'text-pink-400',
  },
  field_change: {
    label: 'Details Updated',
    Icon: Pencil,
    iconClass: 'text-sky-400',
  },
  value_change: {
    label: 'Value Changed',
    Icon: TrendingUp,
    iconClass: 'text-amber-400',
  },
  note: {
    label: 'Note',
    Icon: FileText,
    iconClass: 'text-violet-400',
  },
};

function getActivityMeta(type: string): ActivityMeta {
  return (
    ACTIVITY_META[type] ?? {
      label: type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      Icon: ActivityIcon,
      iconClass: 'text-zinc-400',
    }
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
      <p className="text-xs text-zinc-500 uppercase tracking-wide">{label}</p>
      <p className="mt-0.5 text-sm text-zinc-100">{value ?? '-'}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit deal dialog
// ---------------------------------------------------------------------------

interface EditDialogProps {
  deal: Deal;
  onClose: () => void;
}

function EditDealDialog({ deal, onClose }: EditDialogProps) {
  const [name, setName] = useState(deal.name);
  const [value, setValue] = useState(deal.value != null ? String(deal.value) : '');
  const [expectedCloseDate, setExpectedCloseDate] = useState(
    deal.expectedCloseDate
      ? deal.expectedCloseDate.slice(0, 10)
      : ''
  );
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    const parsedValue = value.trim() !== '' ? parseFloat(value) : null;

    if (name.trim() === '') {
      toast.error('Name is required');
      return;
    }

    if (parsedValue !== null && isNaN(parsedValue)) {
      toast.error('Value must be a valid number');
      return;
    }

    const fields: DealEditFields = {
      name: name.trim(),
      value: parsedValue,
      expectedCloseDate:
        expectedCloseDate.trim() !== '' ? expectedCloseDate.trim() : null,
    };

    startTransition(async () => {
      const result = await updateDeal(deal.id, fields);
      if (result.success) {
        toast.success('Deal updated');
        onClose();
      } else {
        toast.error(result.error ?? 'Failed to update deal');
      }
    });
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md border-zinc-700 bg-zinc-900 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Deal</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-name" className="text-zinc-300">
              Name
            </Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Deal name"
              className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-[#D4A017]"
              disabled={isPending}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-value" className="text-zinc-300">
              Value ($)
            </Label>
            <Input
              id="edit-value"
              type="number"
              min="0"
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0.00"
              className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-[#D4A017]"
              disabled={isPending}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-close-date" className="text-zinc-300">
              Expected Close Date
            </Label>
            <Input
              id="edit-close-date"
              type="date"
              value={expectedCloseDate}
              onChange={(e) => setExpectedCloseDate(e.target.value)}
              className="border-zinc-700 bg-zinc-800 text-white focus-visible:ring-[#D4A017] [color-scheme:dark]"
              disabled={isPending}
            />
          </div>
        </div>

        <DialogFooter className="flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isPending}
            className="text-zinc-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isPending}
            className="bg-[#D4A017] text-black hover:bg-[#D4A017]/90"
          >
            {isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Close Lost dialog (needs loss reason)
// ---------------------------------------------------------------------------

interface CloseLostDialogProps {
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  isPending: boolean;
}

function CloseLostDialog({ onConfirm, onCancel, isPending }: CloseLostDialogProps) {
  const [reason, setReason] = useState('');

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="sm:max-w-sm border-zinc-700 bg-zinc-900 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Mark as Lost</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-1.5 py-2">
          <Label htmlFor="loss-reason" className="text-zinc-300">
            Loss Reason <span className="text-zinc-500">(optional)</span>
          </Label>
          <Input
            id="loss-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why was this deal lost?"
            className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-red-500"
            disabled={isPending}
            autoFocus
          />
        </div>
        <DialogFooter className="flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={isPending}
            className="text-zinc-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm(reason)}
            disabled={isPending}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {isPending ? 'Saving...' : 'Confirm Lost'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DealDetailClient({ deal }: Props) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [closeLostOpen, setCloseLostOpen] = useState(false);
  const [isClosing, startCloseTransition] = useTransition();

  const statusBadge = STATUS_BADGE[deal.status];
  const isClosed = deal.status !== 'open';

  function handleCloseWon() {
    startCloseTransition(async () => {
      const result = await closeDeal(deal.id, 'won');
      if (result.success) {
        toast.success('Deal marked as Won');
      } else {
        toast.error(result.error ?? 'Failed to close deal');
      }
    });
  }

  function handleCloseLost(reason: string) {
    startCloseTransition(async () => {
      const result = await closeDeal(deal.id, 'lost', reason.trim() || undefined);
      if (result.success) {
        toast.success('Deal marked as Lost');
        setCloseLostOpen(false);
      } else {
        toast.error(result.error ?? 'Failed to close deal');
      }
    });
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back navigation */}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/pipeline')}
          className="text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="size-4 mr-1" />
          Back to Pipeline
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/pipeline/${deal.id}/splits`)}
          className="border-zinc-700 text-zinc-200 hover:border-[#D4A017] hover:text-[#D4A017]"
        >
          Commission splits
        </Button>
      </div>

      {/* Deal info card */}
      <Card className="border-zinc-700 bg-zinc-900">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <CardTitle className="text-xl text-white">{deal.name}</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className={statusBadge.className}
                >
                  {statusBadge.label}
                </Badge>
                <Badge
                  variant="outline"
                  className="border-zinc-600 text-zinc-400"
                >
                  {deal.stage.name}
                </Badge>
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditOpen(true)}
                disabled={isClosed}
                className="border-zinc-600 bg-zinc-800 text-zinc-200 hover:bg-zinc-700 hover:text-white disabled:opacity-40"
              >
                <Pencil className="size-4 mr-1" />
                Edit
              </Button>
            </div>
          </div>
        </CardHeader>

        <Separator className="bg-zinc-700" />

        <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow
            label="Value"
            value={deal.value != null ? fmt.format(deal.value) : 'No value'}
          />
          <InfoRow
            label="Contact"
            value={deal.contact.name}
          />
          <InfoRow label="Pipeline" value={deal.stage.pipelineName} />
          <InfoRow label="Stage" value={deal.stage.name} />
          <InfoRow
            label="Expected Close"
            value={deal.expectedCloseDate ? formatDate(deal.expectedCloseDate) : null}
          />
          {deal.closedAt && (
            <InfoRow label="Closed" value={formatDate(deal.closedAt)} />
          )}
          {deal.lostReason && (
            <InfoRow label="Loss Reason" value={deal.lostReason} />
          )}
          <InfoRow label="Stage Since" value={formatDate(deal.stageChangedAt)} />
          <InfoRow label="Created" value={formatDate(deal.createdAt)} />
          <InfoRow label="Last Updated" value={formatDate(deal.updatedAt)} />
          {deal.contact.email && (
            <InfoRow label="Contact Email" value={deal.contact.email} />
          )}
        </CardContent>

        {/* Contact link */}
        <div className="px-6 pb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/contacts/${deal.contact.id}`)}
            className="text-[#D4A017] hover:text-[#D4A017]/80 px-0 h-auto text-sm"
          >
            View Contact: {deal.contact.name} &rarr;
          </Button>
        </div>

        {/* Close Won / Close Lost actions */}
        {!isClosed && (
          <>
            <Separator className="bg-zinc-700" />
            <div className="px-6 py-4 flex items-center gap-3">
              <Button
                onClick={handleCloseWon}
                disabled={isClosing}
                className="bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500"
              >
                {isClosing ? 'Saving...' : 'Close Won'}
              </Button>
              <Button
                onClick={() => setCloseLostOpen(true)}
                disabled={isClosing}
                className="bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500"
              >
                Close Lost
              </Button>
            </div>
          </>
        )}
      </Card>

      {/* Activity timeline */}
      <Card className="border-zinc-700 bg-zinc-900">
        <CardHeader>
          <CardTitle className="text-base text-white">Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {deal.activities.length === 0 ? (
            <p className="text-sm text-zinc-500 py-4 text-center">
              No activity recorded yet.
            </p>
          ) : (
            <ul className="space-y-0">
              {deal.activities.map((activity, idx) => {
                const meta = getActivityMeta(activity.type);
                const { Icon, iconClass, label } = meta;
                const isLast = idx === deal.activities.length - 1;

                return (
                  <li key={activity.id} className="flex gap-3">
                    {/* Timeline spine */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-zinc-800 ${iconClass}`}
                      >
                        <Icon className="size-3.5" />
                      </div>
                      {!isLast && (
                        <div className="w-px flex-1 bg-zinc-700 my-1" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 pb-4">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-zinc-100">
                          {label}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {formatRelativeTime(activity.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-zinc-400">
                        {activity.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      {editOpen && (
        <EditDealDialog deal={deal} onClose={() => setEditOpen(false)} />
      )}

      {/* Close Lost dialog */}
      {closeLostOpen && (
        <CloseLostDialog
          onConfirm={handleCloseLost}
          onCancel={() => setCloseLostOpen(false)}
          isPending={isClosing}
        />
      )}
    </div>
  );
}
