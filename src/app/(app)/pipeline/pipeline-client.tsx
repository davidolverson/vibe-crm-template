'use client';

import { useState, useTransition, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Kanban } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { DealForm } from '@/components/pipeline/deal-form';
import { moveDeal, updateDeal, closeDeal } from './actions';
import type { DealEditFields } from './actions';
import { toast } from 'sonner';

// MIME keys used to ferry drag payload through dataTransfer
const DT_DEAL_ID = 'application/vnd.vibe.dealId';
const DT_FROM_STAGE = 'application/vnd.vibe.fromStageId';

const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

function daysInStage(isoDate: string): number {
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 86400000);
}

interface DealRow {
  id: string;
  name: string;
  contactName: string | null;
  value: number | null;
  stageChangedAt: string;
  status: string;
  expectedCloseDate?: string | null;
}

interface StageRow {
  id: string;
  name: string;
  position: number;
  deals: DealRow[];
}

interface PipelineData {
  id: string;
  name: string;
  stages: StageRow[];
}

interface ContactOption {
  id: string;
  name: string;
  email: string;
}

interface Props {
  pipeline: PipelineData;
  contacts: ContactOption[];
}

interface EditingDeal {
  id: string;
  name: string;
  value: number | null;
  expectedCloseDate: string | null;
}

function EditDealDialog({
  deal,
  onClose,
}: {
  deal: EditingDeal;
  onClose: () => void;
}) {
  const [name, setName] = useState(deal.name);
  const [value, setValue] = useState(deal.value != null ? String(deal.value) : '');
  const [expectedCloseDate, setExpectedCloseDate] = useState(deal.expectedCloseDate ?? '');
  const [isPending, startTransition] = useTransition();
  const [showLossInput, setShowLossInput] = useState(false);
  const [lossReason, setLossReason] = useState('');

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
      expectedCloseDate: expectedCloseDate.trim() !== '' ? expectedCloseDate.trim() : null,
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

  function handleCloseWon() {
    startTransition(async () => {
      const result = await closeDeal(deal.id, 'won');
      if (result.success) {
        toast.success('Deal marked as Won');
        onClose();
      } else {
        toast.error(result.error ?? 'Failed to close deal');
      }
    });
  }

  function handleCloseLost() {
    if (!showLossInput) {
      setShowLossInput(true);
      return;
    }
    startTransition(async () => {
      const result = await closeDeal(deal.id, 'lost', lossReason.trim() || undefined);
      if (result.success) {
        toast.success('Deal marked as Lost');
        onClose();
      } else {
        toast.error(result.error ?? 'Failed to close deal');
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
            <Label htmlFor="deal-name" className="text-zinc-300">
              Name
            </Label>
            <Input
              id="deal-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Deal name"
              className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-[#D4A017]"
              disabled={isPending}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="deal-value" className="text-zinc-300">
              Value ($)
            </Label>
            <Input
              id="deal-value"
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
            <Label htmlFor="deal-close-date" className="text-zinc-300">
              Expected Close Date
            </Label>
            <Input
              id="deal-close-date"
              type="date"
              value={expectedCloseDate}
              onChange={(e) => setExpectedCloseDate(e.target.value)}
              className="border-zinc-700 bg-zinc-800 text-white focus-visible:ring-[#D4A017] [color-scheme:dark]"
              disabled={isPending}
            />
          </div>
        </div>

        {showLossInput && (
          <div className="flex flex-col gap-1.5 pb-2">
            <Label htmlFor="loss-reason" className="text-zinc-300">
              Loss Reason <span className="text-zinc-500">(optional)</span>
            </Label>
            <Input
              id="loss-reason"
              value={lossReason}
              onChange={(e) => setLossReason(e.target.value)}
              placeholder="Why was this deal lost?"
              className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-red-500"
              disabled={isPending}
              autoFocus
            />
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <Button
              onClick={handleCloseWon}
              disabled={isPending}
              className="bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500"
            >
              {isPending ? 'Saving...' : 'Close Won'}
            </Button>
            <Button
              onClick={handleCloseLost}
              disabled={isPending}
              className="bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500"
            >
              {isPending ? 'Saving...' : showLossInput ? 'Confirm Lost' : 'Close Lost'}
            </Button>
            {showLossInput && (
              <Button
                variant="ghost"
                onClick={() => { setShowLossInput(false); setLossReason(''); }}
                disabled={isPending}
                className="text-zinc-400 hover:text-white"
              >
                Cancel
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {!showLossInput && (
              <Button
                variant="ghost"
                onClick={onClose}
                disabled={isPending}
                className="text-zinc-400 hover:text-white"
              >
                Cancel
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={isPending}
              className="bg-[#D4A017] text-black hover:bg-[#D4A017]/90"
            >
              {isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function PipelineClient({ pipeline, contacts }: Props) {
  const searchParams = useSearchParams();
  const prefillContactId = searchParams.get('contactId');
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [prefillUsed, setPrefillUsed] = useState(false);
  const [movingDealId, setMovingDealId] = useState<string | null>(null);
  const [editingDeal, setEditingDeal] = useState<EditingDeal | null>(null);

  // If we arrived from a contact page with ?contactId=... and the pipeline has
  // at least one stage, auto-open the DealForm on the first stage preselected
  // with that contact. Only fires once per mount to avoid reopening on search
  // params change.
  useEffect(() => {
    if (prefillUsed) return;
    if (!prefillContactId) return;
    const firstStageId = pipeline.stages[0]?.id;
    if (!firstStageId) return;
    // One-shot prefill (guarded by prefillUsed): open the composer for a
    // deep-linked contact once on mount. Deliberate effect setState.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveStageId(firstStageId);
    setPrefillUsed(true);
  }, [prefillContactId, prefillUsed, pipeline.stages]);

  // Drag-and-drop state
  const [draggingDealId, setDraggingDealId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

  // Per-column enter counters prevent flicker when the pointer crosses child elements.
  // Counter increments on dragenter, decrements on dragleave; column is highlighted while > 0.
  const dragEnterCounters = useRef<Record<string, number>>({});

  const stageIds = pipeline.stages.map((s) => s.id);

  async function handleMove(dealId: string, newStageId: string) {
    setMovingDealId(dealId);
    const result = await moveDeal(dealId, newStageId);
    setMovingDealId(null);
    if (result.success) {
      toast.success('Deal moved');
    } else {
      toast.error(result.error ?? 'Failed to move deal');
    }
  }

  // Card drag handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, dealId: string, fromStageId: string) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData(DT_DEAL_ID, dealId);
      e.dataTransfer.setData(DT_FROM_STAGE, fromStageId);
      setDraggingDealId(dealId);
    },
    []
  );

  const handleDragEnd = useCallback(() => {
    setDraggingDealId(null);
    setDragOverStageId(null);
    dragEnterCounters.current = {};
  }, []);

  // Column drop-zone handlers
  const handleColumnDragEnter = useCallback(
    (e: React.DragEvent<HTMLDivElement>, stageId: string) => {
      e.preventDefault();
      const prev = dragEnterCounters.current[stageId] ?? 0;
      dragEnterCounters.current[stageId] = prev + 1;
      if (prev === 0) setDragOverStageId(stageId);
    },
    []
  );

  const handleColumnDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>, stageId: string) => {
      e.preventDefault();
      const next = Math.max(0, (dragEnterCounters.current[stageId] ?? 1) - 1);
      dragEnterCounters.current[stageId] = next;
      if (next === 0) setDragOverStageId((prev) => (prev === stageId ? null : prev));
    },
    []
  );

  const handleColumnDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    // preventDefault is required for the drop event to fire
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleColumnDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>, targetStageId: string) => {
      e.preventDefault();
      const dealId = e.dataTransfer.getData(DT_DEAL_ID);
      const fromStageId = e.dataTransfer.getData(DT_FROM_STAGE);

      // Reset visual state immediately
      dragEnterCounters.current[targetStageId] = 0;
      setDraggingDealId(null);
      setDragOverStageId(null);

      if (!dealId || !fromStageId) return;
      if (fromStageId === targetStageId) return; // no-op: dropped on the same column

      void handleMove(dealId, targetStageId);
    },
    // handleMove closes over only stable state setters so the dep array is safe to leave empty
    []
  );

  function handleEditClick(deal: DealRow) {
    setEditingDeal({
      id: deal.id,
      name: deal.name,
      value: deal.value,
      expectedCloseDate: deal.expectedCloseDate ?? null,
    });
  }

  const totalDeals = pipeline.stages.reduce(
    (sum, s) => sum + s.deals.length,
    0,
  );

  return (
    <div className="flex h-full flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{pipeline.name}</h1>
      </div>

      {totalDeals === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-2xl border border-zinc-800 bg-zinc-900/60">
          <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-2xl border border-zinc-800 bg-zinc-900">
            <Kanban className="w-8 h-8 text-zinc-500" strokeWidth={1.5} />
          </div>
          <h3 className="font-semibold text-xl text-zinc-100 mb-2">
            Your pipeline is waiting
          </h3>
          <p className="text-zinc-400 max-w-md mb-6 leading-relaxed">
            Deals land here once contacts flow in. Start by capturing a lead
            from a form, or create a deal by hand from any contact&rsquo;s page.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/forms"
              className="inline-flex items-center justify-center rounded-lg bg-[#D4A017] text-[#0A0A0F] font-semibold px-5 py-2.5 hover:brightness-110 transition-[filter]"
            >
              Set up a lead form
            </Link>
            <Link
              href="/contacts"
              className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors underline underline-offset-4"
            >
              Or add a contact first
            </Link>
          </div>
        </div>
      ) : null}

      <div className="flex gap-4 overflow-x-auto pb-4">
        {pipeline.stages.map((stage) => {
          const totalValue = stage.deals.reduce((sum, d) => sum + (d.value ?? 0), 0);
          const prevStageId = stageIds[stageIds.indexOf(stage.id) - 1] ?? null;
          const nextStageId = stageIds[stageIds.indexOf(stage.id) + 1] ?? null;

          const isDropTarget = dragOverStageId === stage.id;

          return (
            <div
              key={stage.id}
              className={[
                'flex w-72 shrink-0 flex-col rounded-lg bg-zinc-900 transition-all duration-150',
                isDropTarget
                  ? 'ring-2 ring-[#D4A017] ring-offset-2 ring-offset-zinc-950'
                  : '',
              ].join(' ')}
              onDragEnter={(e) => handleColumnDragEnter(e, stage.id)}
              onDragLeave={(e) => handleColumnDragLeave(e, stage.id)}
              onDragOver={handleColumnDragOver}
              onDrop={(e) => handleColumnDrop(e, stage.id)}
            >
              {/* Column header */}
              <div
                className={[
                  'flex items-center justify-between rounded-t-lg border-b-2 px-4 py-3 transition-colors duration-150',
                  isDropTarget ? 'bg-zinc-800' : '',
                ].join(' ')}
                style={{ borderColor: isDropTarget ? '#E8B42A' : '#D4A017' }}
              >
                <div>
                  <p className="text-sm font-semibold text-white">{stage.name}</p>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    {stage.deals.length} deal{stage.deals.length !== 1 ? 's' : ''} &middot;{' '}
                    {fmt.format(totalValue)}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="border-zinc-600 text-zinc-400"
                >
                  {stage.deals.length}
                </Badge>
              </div>

              {/* Deal cards */}
              <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
                {stage.deals.map((deal) => {
                  const days = daysInStage(deal.stageChangedAt);
                  const isMoving = movingDealId === deal.id;
                  const isDragging = draggingDealId === deal.id;

                  return (
                    <Card
                      key={deal.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, deal.id, stage.id)}
                      onDragEnd={handleDragEnd}
                      className={[
                        'border border-zinc-700 bg-zinc-800 p-3 transition-all',
                        'cursor-grab active:cursor-grabbing hover:border-zinc-500',
                        isDragging
                          ? 'opacity-50 scale-95 border-dashed border-[#D4A017]'
                          : '',
                        isMoving && !isDragging ? 'opacity-60' : '',
                      ].join(' ')}
                      onClick={() => {
                        // Prevent the click that fires at drag-end from opening the edit modal
                        if (!isDragging) handleEditClick(deal);
                      }}
                    >
                      <p className="text-sm font-medium text-white leading-snug">
                        {deal.name}
                      </p>
                      {deal.contactName && (
                        <p className="mt-1 text-xs text-zinc-400">{deal.contactName}</p>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs font-medium text-[#D4A017]">
                          {deal.value != null ? fmt.format(deal.value) : 'No value'}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {days === 0 ? 'Today' : `${days}d`}
                        </span>
                      </div>
                      {deal.expectedCloseDate && (
                        <p className="mt-1 text-xs text-zinc-500">
                          Close:{' '}
                          {new Date(deal.expectedCloseDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      )}

                      {/* Move controls */}
                      <div className="mt-2 flex gap-1">
                        {prevStageId && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={isMoving}
                            onClick={(e) => { e.stopPropagation(); handleMove(deal.id, prevStageId); }}
                            className="h-6 px-2 text-xs text-zinc-400 hover:text-white"
                          >
                            &larr; Back
                          </Button>
                        )}
                        {nextStageId && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={isMoving}
                            onClick={(e) => { e.stopPropagation(); handleMove(deal.id, nextStageId); }}
                            className="ml-auto h-6 px-2 text-xs text-zinc-400 hover:text-white"
                          >
                            Next &rarr;
                          </Button>
                        )}
                      </div>

                      {/* View details link */}
                      <div className="mt-1 flex justify-end">
                        <Link
                          href={`/pipeline/${deal.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-zinc-500 hover:text-[#D4A017] transition-colors"
                        >
                          View Details &rarr;
                        </Link>
                      </div>
                    </Card>
                  );
                })}

                {/* Add Deal button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 w-full justify-start text-xs text-zinc-500 hover:text-[#D4A017]"
                  onClick={() => setActiveStageId(stage.id)}
                >
                  + Add Deal
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {activeStageId && (
        <DealForm
          stageId={activeStageId}
          onClose={() => setActiveStageId(null)}
          contacts={contacts}
          initialContactId={prefillContactId && prefillUsed ? prefillContactId : null}
        />
      )}

      {editingDeal && (
        <EditDealDialog
          deal={editingDeal}
          onClose={() => setEditingDeal(null)}
        />
      )}
    </div>
  );
}
