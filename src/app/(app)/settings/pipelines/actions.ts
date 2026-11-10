'use server';

import { revalidatePath } from 'next/cache';
import { withPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { getTemplate, ALL_TEMPLATES, type PipelineKind } from '@/lib/pipeline-templates';

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function installPipelineTemplate(
  kind: PipelineKind,
): Promise<ActionResult<{ pipelineId: string }>> {
  return withPermission('pipeline.edit', async (ctx) => {
    const existing = await prisma.pipeline.findFirst({
      where: { tenantId: ctx.tenantId, kind },
    });
    if (existing) {
      return { success: false, error: `A ${kind} pipeline already exists` };
    }

    const template = getTemplate(kind);

    const pipeline = await prisma.pipeline.create({
      data: {
        tenantId: ctx.tenantId,
        name: template.name,
        kind,
        isDefault: false,
        stages: {
          create: template.stages.map((s) => ({
            tenantId: ctx.tenantId,
            name: s.name,
            position: s.position,
          })),
        },
      },
    });

    revalidatePath('/settings/pipelines');
    revalidatePath('/pipeline');
    return { success: true, data: { pipelineId: pipeline.id } };
  });
}

export async function uninstallPipelineTemplate(
  pipelineId: string,
): Promise<ActionResult<{ pipelineId: string }>> {
  return withPermission('pipeline.edit', async (ctx) => {
    const pipeline = await prisma.pipeline.findFirst({
      where: { id: pipelineId, tenantId: ctx.tenantId },
      include: { stages: { select: { _count: { select: { deals: true } } } } },
    });
    if (!pipeline) return { success: false, error: 'Pipeline not found' };
    if (pipeline.isDefault) {
      return { success: false, error: 'Cannot remove the default pipeline' };
    }
    const dealCount = pipeline.stages.reduce((sum, s) => sum + s._count.deals, 0);
    if (dealCount > 0) {
      return {
        success: false,
        error: `This pipeline has ${dealCount} deal${dealCount === 1 ? '' : 's'}. Move or delete them first.`,
      };
    }

    // Stages cascade via the schema's onDelete: Cascade relation.
    await prisma.pipeline.delete({ where: { id: pipelineId } });

    revalidatePath('/settings/pipelines');
    revalidatePath('/pipeline');
    return { success: true, data: { pipelineId } };
  });
}

export async function listInstalledPipelines() {
  return withPermission('pipeline.view', async (ctx) => {
    const pipelines = await prisma.pipeline.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      include: {
        _count: { select: { stages: true } },
        stages: { select: { _count: { select: { deals: true } } } },
      },
    });

    const installed = new Set(pipelines.map((p) => p.kind));
    const available = ALL_TEMPLATES.filter((t) => !installed.has(t.key));

    return {
      installed: pipelines.map((p) => ({
        id: p.id,
        name: p.name,
        kind: p.kind,
        isDefault: p.isDefault,
        stageCount: p._count.stages,
        dealCount: p.stages.reduce((sum, s) => sum + s._count.deals, 0),
      })),
      available: available.map((t) => ({
        key: t.key,
        name: t.name,
        description: t.description,
        stageCount: t.stages.length,
      })),
    };
  });
}
