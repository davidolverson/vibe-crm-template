'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TaskStatus } from '@/generated/prisma/enums';
import { Calendar, Trash2, User } from 'lucide-react';
import type { TaskPriority, TaskRow } from './tasks-client';

export function isOverdue(task: TaskRow): boolean {
  return (
    task.status === TaskStatus.pending &&
    task.dueAt !== null &&
    new Date(task.dueAt) < new Date()
  );
}

function statusVariant(
  status: TaskStatus
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === TaskStatus.completed) return 'default';
  if (status === TaskStatus.cancelled) return 'outline';
  return 'secondary';
}

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

// exported for use in page.tsx sort if needed
export { PRIORITY_ORDER };

function priorityBadge(priority: TaskPriority) {
  const configs: Record<TaskPriority, { label: string; className: string }> = {
    low: {
      label: 'Low',
      className: 'bg-muted text-muted-foreground border-muted-foreground/20',
    },
    medium: {
      label: 'Medium',
      className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400',
    },
    high: {
      label: 'High',
      className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400',
    },
    urgent: {
      label: 'Urgent',
      className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-500',
    },
  };

  const config = configs[priority] ?? configs.medium;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

interface Props {
  task: TaskRow;
  onToggle: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
  isPending: boolean;
}

export function TaskItem({ task, onToggle, onDelete, isPending }: Props) {
  const overdue = isOverdue(task);
  const nextStatus =
    task.status === TaskStatus.completed ? TaskStatus.pending : TaskStatus.completed;

  return (
    <li
      className={`flex items-start justify-between gap-4 py-3 border-b border-border last:border-0 ${
        overdue ? 'bg-destructive/5 -mx-4 px-4 rounded' : ''
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium truncate ${overdue ? 'text-destructive' : 'text-foreground'}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          {task.contactName && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="size-3" />
              {task.contactName}
            </span>
          )}
          {task.dueAt && (
            <span className={`flex items-center gap-1 text-xs ${overdue ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
              <Calendar className="size-3" />
              {new Date(task.dueAt).toLocaleDateString()}
              {overdue && ' (overdue)'}
            </span>
          )}
          {priorityBadge(task.priority)}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant={statusVariant(task.status)} className="capitalize">
          {task.status}
        </Badge>
        {task.status !== TaskStatus.cancelled && (
          <Button
            size="sm"
            variant="ghost"
            className="text-xs h-7 px-2"
            disabled={isPending}
            onClick={() => onToggle(task.id, nextStatus)}
          >
            {task.status === TaskStatus.completed ? 'Reopen' : 'Complete'}
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          disabled={isPending}
          onClick={() => onDelete(task.id)}
          aria-label="Delete task"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </li>
  );
}
