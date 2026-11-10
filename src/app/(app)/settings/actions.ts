'use server';

import { revalidatePath } from 'next/cache';
import { withPermission } from '@/lib/permissions';
import { getTenantDb } from '@/lib/prisma-tenant';
import { sanitizeString } from '@/lib/sanitize';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth-server';
import { headers } from 'next/headers';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface TeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  roleName: string;
  joinedAt: string;
}

export interface StageRow {
  id: string;
  name: string;
  position: number;
  pipelineId: string;
}

export type EmailTemplateCategory =
  | 'follow_up'
  | 'listing'
  | 'mortgage'
  | 'insurance'
  | 'investing';

export interface EmailTemplateRow {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: EmailTemplateCategory;
  createdAt: string;
  updatedAt: string;
}

export interface EmailTemplateInput {
  name: string;
  subject: string;
  body: string;
  category: EmailTemplateCategory;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function listTeamMembers(): Promise<ActionResult<TeamMember[]>> {
  try {
    return await withPermission('settings.view', async () => {
      const db = getTenantDb();

      const tenantUsers = await db.tenantUser.findMany({
        where: { deletedAt: null },
        include: { role: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      });

      if (tenantUsers.length === 0) {
        return { success: true, data: [] };
      }

      const userIds = tenantUsers.map((tu) => tu.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      });

      const userMap = new Map(users.map((u) => [u.id, u]));

      const members: TeamMember[] = tenantUsers.map((tu) => {
        const u = userMap.get(tu.userId);
        return {
          id: tu.id,
          userId: tu.userId,
          name: u?.name ?? 'Unknown',
          email: u?.email ?? '',
          roleName: tu.role.name,
          joinedAt: tu.createdAt.toISOString(),
        };
      });

      return { success: true, data: members };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load team';
    return { success: false, error: message };
  }
}

export async function listPipelineStages(): Promise<ActionResult<StageRow[]>> {
  try {
    return await withPermission('pipeline.view', async () => {
      const db = getTenantDb();

      const pipeline = await db.pipeline.findFirst({
        where: { isDefault: true },
        include: {
          stages: { orderBy: { position: 'asc' } },
        },
      });

      const source =
        pipeline ??
        (await db.pipeline.findFirst({
          orderBy: { createdAt: 'asc' },
          include: { stages: { orderBy: { position: 'asc' } } },
        }));

      if (!source) return { success: true, data: [] };

      const stages: StageRow[] = source.stages.map((s) => ({
        id: s.id,
        name: s.name,
        position: s.position,
        pipelineId: s.pipelineId,
      }));

      return { success: true, data: stages };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load stages';
    return { success: false, error: message };
  }
}

export async function listEmailTemplates(): Promise<ActionResult<EmailTemplateRow[]>> {
  try {
    return await withPermission('settings.view', async () => {
      const db = getTenantDb();

      const templates = await db.emailTemplate.findMany({
        orderBy: { createdAt: 'desc' },
      });

      const rows: EmailTemplateRow[] = templates.map((t) => ({
        id: t.id,
        name: t.name,
        subject: t.subject,
        body: t.body,
        category: t.category as EmailTemplateCategory,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      }));

      return { success: true, data: rows };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load templates';
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function renameStage(
  stageId: string,
  name: string
): Promise<ActionResult<undefined>> {
  const trimmed = sanitizeString(name);
  if (!trimmed) return { success: false, error: 'Stage name cannot be empty' };
  if (trimmed.length > 80) return { success: false, error: 'Stage name too long (max 80 chars)' };

  try {
    return await withPermission('settings.edit', async () => {
      // also requires pipeline.edit -- caller must have settings.edit which is Owner-only
      const db = getTenantDb();

      const existing = await db.pipelineStage.findUnique({ where: { id: stageId } });
      if (!existing) return { success: false, error: 'Stage not found' };

      await db.pipelineStage.update({
        where: { id: stageId },
        data: { name: trimmed },
      });

      revalidatePath('/settings');
      revalidatePath('/pipeline');
      return { success: true, data: undefined };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to rename stage';
    return { success: false, error: message };
  }
}

export async function addStage(
  pipelineId: string,
  name: string
): Promise<ActionResult<StageRow>> {
  const trimmed = sanitizeString(name);
  if (!trimmed) return { success: false, error: 'Stage name cannot be empty' };
  if (trimmed.length > 80) return { success: false, error: 'Stage name too long (max 80 chars)' };

  try {
    return await withPermission('settings.edit', async (ctx) => {
      const db = getTenantDb();

      const pipeline = await db.pipeline.findUnique({ where: { id: pipelineId } });
      if (!pipeline) return { success: false, error: 'Pipeline not found' };

      const last = await db.pipelineStage.findFirst({
        where: { pipelineId },
        orderBy: { position: 'desc' },
        select: { position: true },
      });

      const nextPosition = (last?.position ?? -1) + 1;

      const stage = await db.pipelineStage.create({
        data: {
          pipelineId,
          tenantId: ctx.tenantId,
          name: trimmed,
          position: nextPosition,
        },
      });

      revalidatePath('/settings');
      revalidatePath('/pipeline');

      return {
        success: true,
        data: {
          id: stage.id,
          name: stage.name,
          position: stage.position,
          pipelineId: stage.pipelineId,
        },
      };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add stage';
    return { success: false, error: message };
  }
}

export async function reorderStage(
  stageId: string,
  direction: 'up' | 'down'
): Promise<ActionResult<undefined>> {
  try {
    return await withPermission('settings.edit', async () => {
      const db = getTenantDb();

      const stage = await db.pipelineStage.findUnique({ where: { id: stageId } });
      if (!stage) return { success: false, error: 'Stage not found' };

      const sibling = await db.pipelineStage.findFirst({
        where: {
          pipelineId: stage.pipelineId,
          position:
            direction === 'up'
              ? { lt: stage.position }
              : { gt: stage.position },
        },
        orderBy: { position: direction === 'up' ? 'desc' : 'asc' },
      });

      if (!sibling) {
        return { success: false, error: 'Already at boundary, cannot move further' };
      }

      // Swap positions atomically with a temp value to avoid unique constraint issues
      const tempPosition = -1;
      await db.pipelineStage.update({
        where: { id: stage.id },
        data: { position: tempPosition },
      });
      await db.pipelineStage.update({
        where: { id: sibling.id },
        data: { position: stage.position },
      });
      await db.pipelineStage.update({
        where: { id: stage.id },
        data: { position: sibling.position },
      });

      revalidatePath('/settings');
      revalidatePath('/pipeline');
      return { success: true, data: undefined };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to reorder stage';
    return { success: false, error: message };
  }
}

export async function createEmailTemplate(
  input: EmailTemplateInput
): Promise<ActionResult<EmailTemplateRow>> {
  const name = sanitizeString(input.name);
  const subject = sanitizeString(input.subject);
  const body = input.body.trim();

  if (!name) return { success: false, error: 'Template name is required' };
  if (name.length > 120) return { success: false, error: 'Template name too long (max 120 chars)' };
  if (!subject) return { success: false, error: 'Subject line is required' };
  if (subject.length > 255) return { success: false, error: 'Subject too long (max 255 chars)' };
  if (!body) return { success: false, error: 'Body is required' };

  const validCategories: EmailTemplateCategory[] = [
    'follow_up',
    'listing',
    'mortgage',
    'insurance',
    'investing',
  ];
  if (!validCategories.includes(input.category)) {
    return { success: false, error: 'Invalid category' };
  }

  try {
    return await withPermission('settings.edit', async (ctx) => {
      const db = getTenantDb();

      const template = await db.emailTemplate.create({
        data: {
          tenantId: ctx.tenantId,
          name,
          subject,
          body,
          category: input.category,
        },
      });

      revalidatePath('/settings');

      return {
        success: true,
        data: {
          id: template.id,
          name: template.name,
          subject: template.subject,
          body: template.body,
          category: template.category as EmailTemplateCategory,
          createdAt: template.createdAt.toISOString(),
          updatedAt: template.updatedAt.toISOString(),
        },
      };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create template';
    return { success: false, error: message };
  }
}

export async function updateEmailTemplate(
  templateId: string,
  input: EmailTemplateInput
): Promise<ActionResult<EmailTemplateRow>> {
  const name = sanitizeString(input.name);
  const subject = sanitizeString(input.subject);
  const body = input.body.trim();

  if (!name) return { success: false, error: 'Template name is required' };
  if (name.length > 120) return { success: false, error: 'Template name too long (max 120 chars)' };
  if (!subject) return { success: false, error: 'Subject line is required' };
  if (subject.length > 255) return { success: false, error: 'Subject too long (max 255 chars)' };
  if (!body) return { success: false, error: 'Body is required' };

  const validCategories: EmailTemplateCategory[] = [
    'follow_up',
    'listing',
    'mortgage',
    'insurance',
    'investing',
  ];
  if (!validCategories.includes(input.category)) {
    return { success: false, error: 'Invalid category' };
  }

  try {
    return await withPermission('settings.edit', async () => {
      const db = getTenantDb();

      const existing = await db.emailTemplate.findUnique({ where: { id: templateId } });
      if (!existing) return { success: false, error: 'Template not found' };

      const template = await db.emailTemplate.update({
        where: { id: templateId },
        data: { name, subject, body, category: input.category },
      });

      revalidatePath('/settings');

      return {
        success: true,
        data: {
          id: template.id,
          name: template.name,
          subject: template.subject,
          body: template.body,
          category: template.category as EmailTemplateCategory,
          createdAt: template.createdAt.toISOString(),
          updatedAt: template.updatedAt.toISOString(),
        },
      };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update template';
    return { success: false, error: message };
  }
}

export async function deleteEmailTemplate(
  templateId: string
): Promise<ActionResult<undefined>> {
  if (!templateId) return { success: false, error: 'Template ID is required' };

  try {
    return await withPermission('settings.edit', async () => {
      const db = getTenantDb();

      const existing = await db.emailTemplate.findUnique({ where: { id: templateId } });
      if (!existing) return { success: false, error: 'Template not found' };

      await db.emailTemplate.delete({ where: { id: templateId } });

      revalidatePath('/settings');
      return { success: true, data: undefined };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete template';
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export interface AuditLogRow {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  createdAt: string;
}

export async function listAuditLogs(): Promise<ActionResult<AuditLogRow[]>> {
  try {
    return await withPermission('settings.view', async (ctx) => {
      // Query directly with prisma (not tenant-scoped client) so we can join
      // user records from the global DB in the same pass.
      const logs = await prisma.auditLog.findMany({
        where: { tenantId: ctx.tenantId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      if (logs.length === 0) {
        return { success: true, data: [] };
      }

      // Resolve user details from the global user table
      const userIds = [...new Set(logs.map((l) => l.userId).filter(Boolean) as string[])];
      const users =
        userIds.length > 0
          ? await prisma.user.findMany({
              where: { id: { in: userIds } },
              select: { id: true, name: true, email: true },
            })
          : [];

      const userMap = new Map(users.map((u) => [u.id, u]));

      const rows: AuditLogRow[] = logs.map((l) => {
        const user = l.userId ? userMap.get(l.userId) : undefined;
        return {
          id: l.id,
          action: l.action,
          entity: l.entity,
          entityId: l.entityId,
          metadata: (l.metadata as Record<string, unknown> | null) ?? null,
          userId: l.userId,
          userName: user?.name ?? null,
          userEmail: user?.email ?? null,
          createdAt: l.createdAt.toISOString(),
        };
      });

      return { success: true, data: rows };
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load audit logs';
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Profile mutations (server-side fallbacks -- component uses authClient directly)
// ---------------------------------------------------------------------------

export async function updateUserName(
  name: string
): Promise<ActionResult<undefined>> {
  const trimmed = sanitizeString(name);
  if (!trimmed) return { success: false, error: 'Name cannot be empty' };
  if (trimmed.length > 100) return { success: false, error: 'Name too long (max 100 chars)' };

  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.id) return { success: false, error: 'Not authenticated' };

    await prisma.user.update({
      where: { id: session.user.id },
      data: { name: trimmed },
    });

    revalidatePath('/settings');
    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update name';
    return { success: false, error: message };
  }
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<ActionResult<undefined>> {
  if (!currentPassword) return { success: false, error: 'Current password is required' };
  if (!newPassword || newPassword.length < 8) {
    return { success: false, error: 'New password must be at least 8 characters' };
  }

  try {
    const result = await auth.api.changePassword({
      headers: await headers(),
      body: { currentPassword, newPassword, revokeOtherSessions: false },
    });

    if (!result) return { success: false, error: 'Failed to change password' };

    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to change password';
    return { success: false, error: message };
  }
}
