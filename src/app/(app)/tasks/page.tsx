import { withPermission } from '@/lib/permissions';
import { getTenantDb } from '@/lib/prisma-tenant';
import { TasksClient } from './tasks-client';
import type { TaskPriority } from './tasks-client';

export const metadata = { title: 'Tasks | VIBE' };

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function priorityRank(p: string | null): number {
  return PRIORITY_ORDER[p ?? 'medium'] ?? 2;
}

export default async function TasksPage() {
  const tasks = await withPermission('tasks.view', async () => {
    const db = getTenantDb();
    return db.task.findMany({
      include: { contact: { select: { name: true } } },
      take: 100,
    });
  });

  // Fetch contacts for the task form picker
  const contacts = await withPermission('contacts.view', async () => {
    const db = getTenantDb();
    const list = await db.contact.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
      take: 200,
    });
    return list.map((c) => ({ id: c.id, name: c.name, email: c.email ?? '' }));
  });

  // Sort: overdue pending first, then by priority (urgent > high > medium > low), then by dueAt asc
  const now = new Date();

  const sorted = [...tasks].sort((a, b) => {
    const aOverdue = a.status === 'pending' && a.dueAt !== null && a.dueAt < now;
    const bOverdue = b.status === 'pending' && b.dueAt !== null && b.dueAt < now;

    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;

    const priorityDiff = priorityRank(a.priority) - priorityRank(b.priority);
    if (priorityDiff !== 0) return priorityDiff;

    const aTime = a.dueAt?.getTime() ?? Infinity;
    const bTime = b.dueAt?.getTime() ?? Infinity;
    return aTime - bTime;
  });

  const serialized = sorted.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description ?? null,
    status: t.status,
    dueAt: t.dueAt ? t.dueAt.toISOString() : null,
    contactName: t.contact?.name ?? null,
    priority: (t.priority ?? 'medium') as TaskPriority,
  }));

  return <TasksClient tasks={serialized} contacts={contacts} />;
}
