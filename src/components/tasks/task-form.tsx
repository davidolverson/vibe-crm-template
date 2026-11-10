'use client';

import { useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createTask } from '@/app/(app)/tasks/actions';
import { toast } from 'sonner';
import { ContactPicker, type ContactOption } from '@/components/contacts/contact-picker';

type Priority = 'low' | 'medium' | 'high' | 'urgent';

const PRIORITY_OPTIONS: { value: Priority; label: string; className: string }[] = [
  {
    value: 'low',
    label: 'Low',
    className: 'text-muted-foreground',
  },
  {
    value: 'medium',
    label: 'Medium',
    className: 'text-blue-700 dark:text-blue-400',
  },
  {
    value: 'high',
    label: 'High',
    className: 'text-amber-700 dark:text-amber-400',
  },
  {
    value: 'urgent',
    label: 'Urgent',
    className: 'text-red-700 dark:text-red-500',
  },
];

interface Props {
  onSuccess?: () => void;
  contacts: ContactOption[];
}

export function TaskForm({ onSuccess, contacts }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [contactId, setContactId] = useState<string | null>(null);
  const [priority, setPriority] = useState<Priority>('medium');

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (contactId) {
      formData.set('contactId', contactId);
    } else {
      formData.delete('contactId');
    }
    formData.set('priority', priority);

    startTransition(async () => {
      const result = await createTask(formData);
      if (result.success) {
        formRef.current?.reset();
        setContactId(null);
        setPriority('medium');
        onSuccess?.();
      } else {
        toast.error(result.error ?? 'Something went wrong');
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          name="title"
          placeholder="Task title"
          maxLength={255}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Optional details..."
          maxLength={2000}
          rows={3}
          className="resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="priority">Priority</Label>
        <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
          <SelectTrigger id="priority" className="w-full">
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <span className={`font-medium ${opt.className}`}>{opt.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="dueDate">Due Date</Label>
        <Input
          id="dueDate"
          name="dueDate"
          type="date"
        />
      </div>

      <div className="relative space-y-1.5">
        <ContactPicker
          label="Contact"
          contacts={contacts}
          value={contactId ?? undefined}
          onChange={setContactId}
          placeholder="Select a contact (optional)"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="submit"
          disabled={isPending}
          className="bg-[#D4A017] text-black hover:bg-[#D4A017]/90"
        >
          {isPending ? 'Creating...' : 'Create Task'}
        </Button>
      </div>
    </form>
  );
}
