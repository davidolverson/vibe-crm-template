'use server';

import { revalidatePath } from 'next/cache';
import { withPermission } from '@/lib/permissions';
import { getTenantDb } from '@/lib/prisma-tenant';
import { sanitizeString } from '@/lib/sanitize';
import { TaskCreateSchema } from '@/lib/validations/task';
import { TaskStatus } from '@/generated/prisma/enums';
import type { TaskUncheckedCreateInput } from '@/generated/prisma/models/Task';
import { createNotification } from '@/lib/notifications';

type ActionResult = { success: boolean; error?: string };

export async function createTask(formData: FormData): Promise<ActionResult> {
  const titleRaw = formData.get('title');
  const descriptionRaw = formData.get('description');
  const raw = {
    title: typeof titleRaw === 'string' ? sanitizeString(titleRaw) : titleRaw,
    description: typeof descriptionRaw === 'string' && descriptionRaw ? sanitizeString(descriptionRaw) : undefined,
    contactId: formData.get('contactId') || undefined,
    assigneeId: formData.get('assigneeId') || undefined,
    dueDate: formData.get('dueDate') || undefined,
    priority: formData.get('priority') || undefined,
  };

  const parsed = TaskCreateSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { success: false, error: first?.message ?? 'Validation failed' };
  }

  const { title, description, contactId, assigneeId, dueDate } = parsed.data;
  const priority = (raw.priority as string | undefined) ?? 'medium';

  try {
    await withPermission('tasks.create', async (ctx) => {
      const db = getTenantDb();
      await db.task.create({
        data: {
          title,
          description: description ?? null,
          contactId: contactId ?? null,
          assignedToUserId: assigneeId ?? null,
          dueAt: dueDate ? new Date(dueDate) : null,
          status: TaskStatus.pending,
          priority,
        } as unknown as TaskUncheckedCreateInput,
      });

      void createNotification(ctx.userId, ctx.tenantId, 'task_due', `New task: ${title}`, '/tasks');
    });

    revalidatePath('/tasks');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create task';
    return { success: false, error: message };
  }
}

export async function updateTaskStatus(
  taskId: string,
  status: 'pending' | 'completed' | 'cancelled'
): Promise<ActionResult> {
  try {
    await withPermission('tasks.edit', async () => {
      const db = getTenantDb();
      await db.task.update({
        where: { id: taskId },
        data: { status: status as TaskStatus },
      });
    });

    revalidatePath('/tasks');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update task';
    return { success: false, error: message };
  }
}

export async function deleteTask(taskId: string): Promise<ActionResult> {
  try {
    await withPermission('tasks.delete', async () => {
      const db = getTenantDb();
      await db.task.delete({ where: { id: taskId } });
    });

    revalidatePath('/tasks');
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete task';
    return { success: false, error: message };
  }
}
