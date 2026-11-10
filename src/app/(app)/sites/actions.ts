'use server';

import { revalidatePath } from 'next/cache';
import { withPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { enforcePlanLimit } from '@/lib/plan-enforcement';
import { nameSchema, slugSchema, parseBlocks, blockSchema, type Block } from '@/lib/sites-blocks';
import { ensureSlugAvailable, ensurePageSlugAvailable } from '@/lib/sites';

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

function safeError(e: unknown): string {
  return e instanceof Error ? e.message : 'Unexpected error';
}

// ──────────── SITE ────────────

export async function createSite(params: {
  name: string;
  slug: string;
}): Promise<ActionResult<{ id: string }>> {
  return withPermission('sites.create', async (ctx) => {
    const parsedName = nameSchema.safeParse(params.name);
    if (!parsedName.success) return { success: false, error: parsedName.error.issues[0].message };

    const parsedSlug = slugSchema.safeParse(params.slug);
    if (!parsedSlug.success) return { success: false, error: parsedSlug.error.issues[0].message };

    try {
      await enforcePlanLimit(ctx.tenantId, 'sites');
    } catch (err) {
      return { success: false, error: safeError(err) };
    }

    const taken = await ensureSlugAvailable(ctx.tenantId, parsedSlug.data);
    if (taken) return { success: false, error: taken };

    const site = await prisma.site.create({
      data: {
        tenantId: ctx.tenantId,
        name: parsedName.data,
        slug: parsedSlug.data,
        status: 'draft',
      },
    });

    revalidatePath('/sites');
    return { success: true, data: { id: site.id } };
  });
}

export async function updateSite(params: {
  id: string;
  name?: string;
  slug?: string;
  idxProvider?: string | null;
  idxEmbedHint?: string | null;
}): Promise<ActionResult> {
  return withPermission('sites.edit', async (ctx) => {
    const site = await prisma.site.findFirst({ where: { id: params.id, tenantId: ctx.tenantId } });
    if (!site) return { success: false, error: 'Site not found' };

    const data: Record<string, unknown> = {};

    if (params.name !== undefined) {
      const parsed = nameSchema.safeParse(params.name);
      if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
      data.name = parsed.data;
    }

    if (params.slug !== undefined) {
      const parsed = slugSchema.safeParse(params.slug);
      if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
      if (parsed.data !== site.slug) {
        const taken = await ensureSlugAvailable(ctx.tenantId, parsed.data, params.id);
        if (taken) return { success: false, error: taken };
        data.slug = parsed.data;
      }
    }

    if (params.idxProvider !== undefined) data.idxProvider = params.idxProvider || null;
    if (params.idxEmbedHint !== undefined) {
      data.idxConfig = params.idxEmbedHint ? { embedHint: params.idxEmbedHint } : null;
    }

    await prisma.site.update({ where: { id: params.id }, data });
    revalidatePath(`/sites/${params.id}`);
    revalidatePath('/sites');
    return { success: true, data: undefined };
  });
}

export async function setSiteStatus(params: {
  id: string;
  status: 'draft' | 'published' | 'archived';
}): Promise<ActionResult> {
  return withPermission('sites.edit', async (ctx) => {
    const site = await prisma.site.findFirst({ where: { id: params.id, tenantId: ctx.tenantId } });
    if (!site) return { success: false, error: 'Site not found' };
    await prisma.site.update({ where: { id: params.id }, data: { status: params.status } });
    revalidatePath('/sites');
    revalidatePath(`/sites/${params.id}`);
    return { success: true, data: undefined };
  });
}

export async function deleteSite(id: string): Promise<ActionResult> {
  return withPermission('sites.delete', async (ctx) => {
    const site = await prisma.site.findFirst({ where: { id, tenantId: ctx.tenantId } });
    if (!site) return { success: false, error: 'Site not found' };
    await prisma.site.delete({ where: { id } });
    revalidatePath('/sites');
    return { success: true, data: undefined };
  });
}

// ──────────── PAGE ────────────

export async function createPage(params: {
  siteId: string;
  title: string;
  slug: string;
}): Promise<ActionResult<{ id: string }>> {
  return withPermission('sites.edit', async (ctx) => {
    const site = await prisma.site.findFirst({ where: { id: params.siteId, tenantId: ctx.tenantId } });
    if (!site) return { success: false, error: 'Site not found' };

    const title = params.title.trim();
    if (title.length < 2 || title.length > 120) {
      return { success: false, error: 'Title must be 2-120 characters' };
    }

    const parsedSlug = slugSchema.safeParse(params.slug);
    if (!parsedSlug.success) return { success: false, error: parsedSlug.error.issues[0].message };

    const taken = await ensurePageSlugAvailable(params.siteId, parsedSlug.data);
    if (taken) return { success: false, error: taken };

    const position = await prisma.sitePage.count({ where: { siteId: params.siteId } });

    const page = await prisma.sitePage.create({
      data: {
        tenantId: ctx.tenantId,
        siteId: params.siteId,
        title,
        slug: parsedSlug.data,
        content: [],
        position,
        published: false,
      },
    });

    revalidatePath(`/sites/${params.siteId}`);
    return { success: true, data: { id: page.id } };
  });
}

export async function updatePageMeta(params: {
  siteId: string;
  pageId: string;
  title?: string;
  slug?: string;
}): Promise<ActionResult> {
  return withPermission('sites.edit', async (ctx) => {
    const page = await prisma.sitePage.findFirst({
      where: { id: params.pageId, siteId: params.siteId, tenantId: ctx.tenantId },
    });
    if (!page) return { success: false, error: 'Page not found' };

    const data: Record<string, unknown> = {};

    if (params.title !== undefined) {
      const title = params.title.trim();
      if (title.length < 2 || title.length > 120) {
        return { success: false, error: 'Title must be 2-120 characters' };
      }
      data.title = title;
    }

    if (params.slug !== undefined) {
      const parsed = slugSchema.safeParse(params.slug);
      if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
      if (parsed.data !== page.slug) {
        const taken = await ensurePageSlugAvailable(params.siteId, parsed.data, params.pageId);
        if (taken) return { success: false, error: taken };
        data.slug = parsed.data;
      }
    }

    await prisma.sitePage.update({ where: { id: params.pageId }, data });
    revalidatePath(`/sites/${params.siteId}`);
    revalidatePath(`/sites/${params.siteId}/pages/${params.pageId}`);
    return { success: true, data: undefined };
  });
}

export async function savePageBlocks(params: {
  siteId: string;
  pageId: string;
  blocks: unknown;
}): Promise<ActionResult> {
  return withPermission('sites.edit', async (ctx) => {
    const page = await prisma.sitePage.findFirst({
      where: { id: params.pageId, siteId: params.siteId, tenantId: ctx.tenantId },
    });
    if (!page) return { success: false, error: 'Page not found' };

    if (!Array.isArray(params.blocks)) {
      return { success: false, error: 'Blocks must be an array' };
    }

    const validated: Block[] = [];
    for (let i = 0; i < params.blocks.length; i++) {
      const parsed = blockSchema.safeParse(params.blocks[i]);
      if (!parsed.success) {
        return { success: false, error: `Block ${i + 1}: ${parsed.error.issues[0].message}` };
      }
      validated.push(parsed.data);
    }

    await prisma.sitePage.update({
      where: { id: params.pageId },
      data: { content: validated },
    });

    revalidatePath(`/sites/${params.siteId}/pages/${params.pageId}`);
    return { success: true, data: undefined };
  });
}

export async function setPagePublished(params: {
  siteId: string;
  pageId: string;
  published: boolean;
}): Promise<ActionResult> {
  return withPermission('sites.edit', async (ctx) => {
    const page = await prisma.sitePage.findFirst({
      where: { id: params.pageId, siteId: params.siteId, tenantId: ctx.tenantId },
    });
    if (!page) return { success: false, error: 'Page not found' };

    if (params.published && !Array.isArray(page.content)) {
      return { success: false, error: 'Page has no content blocks yet' };
    }
    if (params.published && parseBlocks(page.content).length === 0) {
      return { success: false, error: 'Add at least one block before publishing' };
    }

    await prisma.sitePage.update({
      where: { id: params.pageId },
      data: { published: params.published },
    });

    revalidatePath(`/sites/${params.siteId}`);
    revalidatePath(`/sites/${params.siteId}/pages/${params.pageId}`);
    return { success: true, data: undefined };
  });
}

export async function deletePage(params: {
  siteId: string;
  pageId: string;
}): Promise<ActionResult> {
  return withPermission('sites.edit', async (ctx) => {
    const page = await prisma.sitePage.findFirst({
      where: { id: params.pageId, siteId: params.siteId, tenantId: ctx.tenantId },
    });
    if (!page) return { success: false, error: 'Page not found' };
    await prisma.sitePage.delete({ where: { id: params.pageId } });
    revalidatePath(`/sites/${params.siteId}`);
    return { success: true, data: undefined };
  });
}
