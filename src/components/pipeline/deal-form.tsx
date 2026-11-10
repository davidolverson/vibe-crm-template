'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { createDeal } from '@/app/(app)/pipeline/actions';
import { ContactPicker, type ContactOption } from '@/components/contacts/contact-picker';

interface Props {
  stageId: string;
  onClose: () => void;
  contacts: ContactOption[];
  initialContactId?: string | null;
}

export function DealForm({ stageId, onClose, contacts, initialContactId = null }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [contactId, setContactId] = useState<string | null>(initialContactId);

  async function handleSubmit(formData: FormData) {
    if (contactId) {
      formData.set('contactId', contactId);
    }
    const result = await createDeal(formData);
    if (result.success) {
      toast.success('Deal created');
      onClose();
    } else {
      toast.error(result.error ?? 'Failed to create deal');
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="border-zinc-700 bg-zinc-900 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">New Deal</DialogTitle>
        </DialogHeader>

        <form ref={formRef} action={handleSubmit} className="flex flex-col gap-4">
          {/* Hidden stageId */}
          <input type="hidden" name="stageId" value={stageId} />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title" className="text-zinc-300">
              Deal Name <span className="text-red-400">*</span>
            </Label>
            <Input
              id="title"
              name="title"
              placeholder="e.g. Q2 Website Project"
              required
              maxLength={255}
              className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus:border-[#D4A017]"
            />
          </div>

          <div className="relative flex flex-col gap-1.5">
            <ContactPicker
              label="Contact"
              required
              contacts={contacts}
              value={contactId ?? undefined}
              onChange={setContactId}
              placeholder="Select a contact..."
            />
            {/* Invisible native input keeps required validation on submit */}
            <input
              type="hidden"
              name="contactId"
              value={contactId ?? ''}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="value" className="text-zinc-300">
              Value ($)
            </Label>
            <Input
              id="value"
              name="value"
              type="number"
              min={0}
              step={0.01}
              placeholder="0.00"
              className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus:border-[#D4A017]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expectedCloseDate" className="text-zinc-300">
              Expected Close Date
            </Label>
            <Input
              id="expectedCloseDate"
              name="expectedCloseDate"
              type="date"
              className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500 focus:border-[#D4A017]"
            />
          </div>

          <DialogFooter className="mt-2 gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-zinc-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              style={{ backgroundColor: '#D4A017', color: '#000' }}
              className="font-semibold hover:opacity-90"
            >
              Create Deal
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
