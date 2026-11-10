'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ContactStatus } from '@/generated/prisma/enums';

interface ContactFormValues {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  status: ContactStatus;
  source?: string;
}

interface ContactFormProps {
  defaultValues?: Partial<ContactFormValues>;
  onSubmit: (formData: FormData) => Promise<{ success: boolean; error?: string }>;
  onSuccess?: () => void;
  submitLabel?: string;
}

export const STATUS_LABELS: Record<ContactStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  nurturing: 'Nurturing',
  customer: 'Customer',
  lost: 'Lost',
};

export const STATUS_BADGE_CLASS: Record<ContactStatus, string> = {
  new: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  contacted: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  qualified: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  nurturing: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  customer: 'bg-green-500/20 text-green-400 border-green-500/30',
  lost: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export function ContactForm({
  defaultValues,
  onSubmit,
  onSuccess,
  submitLabel = 'Save',
}: ContactFormProps) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await onSubmit(formData);
      if (result.success) {
        toast.success('Contact saved successfully.');
        onSuccess?.();
      } else {
        toast.error(result.error ?? 'Something went wrong.');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="cf-name">Name *</Label>
        <Input
          id="cf-name"
          name="name"
          defaultValue={defaultValues?.name ?? ''}
          placeholder="Full name"
          required
          maxLength={255}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="cf-email">Email</Label>
          <Input
            id="cf-email"
            name="email"
            type="email"
            defaultValue={defaultValues?.email ?? ''}
            placeholder="email@example.com"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cf-phone">Phone</Label>
          <Input
            id="cf-phone"
            name="phone"
            type="tel"
            defaultValue={defaultValues?.phone ?? ''}
            placeholder="+1 (555) 000-0000"
            maxLength={50}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="cf-company">Company</Label>
          <Input
            id="cf-company"
            name="company"
            defaultValue={defaultValues?.company ?? ''}
            placeholder="Company name"
            maxLength={255}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cf-source">Source</Label>
          <Input
            id="cf-source"
            name="source"
            defaultValue={defaultValues?.source ?? ''}
            placeholder="Referral, Website..."
            maxLength={100}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cf-status">Status</Label>
        <Select name="status" defaultValue={defaultValues?.status ?? ContactStatus.new}>
          <SelectTrigger id="cf-status">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-[#D4A017] text-black hover:bg-[#D4A017]/90 font-semibold"
        >
          {isPending ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
