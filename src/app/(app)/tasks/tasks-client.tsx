'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { TaskForm } from '@/components/tasks/task-form';
import { TaskItem, isOverdue } from './task-item';
import { updateTaskStatus, deleteTask } from './actions';
import { TaskStatus } from '@/generated/prisma/enums';
import { toast } from 'sonner';
import { Plus, CheckSquare } from 'lucide-react';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueAt: string | null;
  contactName: string | null;
  priority: TaskPriority;
}

interface ContactOption {
  id: string;
  name: string;
  email: string;
}

interface Props {
  tasks: TaskRow[];
  contacts: ContactOption[];
}

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' },
] as const;

type TabValue = (typeof TABS)[number]['value'];

function filterTasks(tasks: TaskRow[], tab: TabValue): TaskRow[] {
  if (tab === 'pending') return tasks.filter((t) => t.status === TaskStatus.pending);
  if (tab === 'completed') return tasks.filter((t) => t.status === TaskStatus.completed);
  if (tab === 'overdue') return tasks.filter(isOverdue);
  return tasks;
}

export function TasksClient({ tasks: initial, contacts }: Props) {
  const [tasks, setTasks] = useState<TaskRow[]>(initial);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleToggle(id: string, nextStatus: TaskStatus) {
    startTransition(async () => {
      const res = await updateTaskStatus(id, nextStatus);
      if (res.success) {
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status: nextStatus } : t)));
      } else {
        toast.error(res.error ?? 'Failed to update task');
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await deleteTask(id);
      if (res.success) {
        setTasks((prev) => prev.filter((t) => t.id !== id));
        toast.success('Task deleted');
      } else {
        toast.error(res.error ?? 'Failed to delete task');
      }
    });
  }

  function renderList(list: TaskRow[], tabValue: string) {
    if (list.length === 0) {
      // Truly empty (no tasks at all) -- show a useful empty state on the All tab
      if (tabValue === 'all' && tasks.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-2xl border border-border bg-card">
            <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-2xl border border-border bg-muted/40">
              <CheckSquare className="w-8 h-8 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <h3 className="font-semibold text-xl mb-2">No tasks yet</h3>
            <p className="text-muted-foreground max-w-md mb-6 leading-relaxed">
              Tasks keep your follow-ups from slipping. Add your first one, or
              let automations create them from lead submissions.
            </p>
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center justify-center rounded-lg bg-[#D4A017] text-[#0A0A0F] font-semibold px-5 py-2.5 hover:brightness-110 transition-[filter]"
            >
              <Plus className="size-4 mr-1" />
              Add your first task
            </button>
          </div>
        );
      }
      return <p className="text-sm text-muted-foreground py-8 text-center">No tasks here.</p>;
    }
    return (
      <ul>
        {list.map((t) => (
          <TaskItem key={t.id} task={t} onToggle={handleToggle} onDelete={handleDelete} isPending={isPending} />
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">Track and manage your to-dos</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#D4A017] text-black hover:bg-[#D4A017]/90">
              <Plus className="size-4 mr-1" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Task</DialogTitle>
            </DialogHeader>
            <TaskForm onSuccess={() => { setOpen(false); toast.success('Task created'); }} contacts={contacts} />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label} ({filterTasks(tasks, tab.value).length})
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-4">
            {renderList(filterTasks(tasks, tab.value), tab.value)}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
