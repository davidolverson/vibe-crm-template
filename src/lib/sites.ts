import { prisma } from './prisma';
import type { SiteStatus } from '../generated/prisma/enums';

// Re-export client-safe block schemas + helpers so existing `@/lib/sites`
// imports keep working. Server-only DB helpers live below.
export * from './sites-blocks';

// ──────────────────────────────────────
// TENANT-SCOPED CRUD
// ──────────────────────────────────────

export interface SiteSummary {
  id: string;
  name: string;
  slug: string;
  status: SiteStatus;
  domain: string | null;
  pageCount: number;
  updatedAt: Date;
}

export async function listSites(tenantId: string): Promise<SiteSummary[]> {
  const rows = await prisma.site.findMany({
    where: { tenantId },
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { pages: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    status: r.status,
    domain: r.domain,
    pageCount: r._count.pages,
    updatedAt: r.updatedAt,
  }));
}

export async function getSite(tenantId: string, id: string) {
  const site = await prisma.site.findFirst({
    where: { id, tenantId },
    include: {
      pages: { orderBy: { position: 'asc' } },
    },
  });
  return site;
}

export async function getPage(tenantId: string, siteId: string, pageId: string) {
  const page = await prisma.sitePage.findFirst({
    where: { id: pageId, siteId, tenantId },
    include: { site: true },
  });
  return page;
}

export async function ensureSlugAvailable(
  tenantId: string,
  slug: string,
  excludeId?: string
): Promise<string | null> {
  const existing = await prisma.site.findFirst({
    where: { tenantId, slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { id: true },
  });
  if (existing) return `Slug "${slug}" is already taken.`;
  return null;
}

export async function ensurePageSlugAvailable(
  siteId: string,
  slug: string,
  excludeId?: string
): Promise<string | null> {
  const existing = await prisma.sitePage.findFirst({
    where: { siteId, slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { id: true },
  });
  if (existing) return `Page slug "${slug}" is already used on this site.`;
  return null;
}

// ──────────────────────────────────────
// PUBLIC READ
// ──────────────────────────────────────

export async function getPublishedSiteBySlug(siteSlug: string) {
  return prisma.site.findFirst({
    where: { slug: siteSlug, status: 'published' },
    orderBy: { createdAt: 'asc' },
  });
}

export async function getPublishedPage(siteId: string, pageSlug: string) {
  return prisma.sitePage.findFirst({
    where: { siteId, slug: pageSlug, published: true },
  });
}

export async function listPublishedBlogPosts(siteId: string, limit = 6) {
  return prisma.blogPost.findMany({
    where: { siteId, status: 'published' },
    orderBy: { publishedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      coverImage: true,
      publishedAt: true,
      author: true,
    },
  });
}

export interface SitePageViewStats {
  totalViews: number;
  uniqueVisitors: number;
  topSources: Array<{ source: string; count: number }>;
  topPages: Array<{ path: string; count: number }>;
}

/**
 * Aggregate page-view stats for a site over a given window. Tenant-scoped.
 */
export async function getSitePageViewStats(
  tenantId: string,
  siteId: string,
  since: Date
): Promise<SitePageViewStats> {
  const views = await prisma.sitePageView.findMany({
    where: { tenantId, siteId, createdAt: { gte: since } },
    select: { anonId: true, utmSource: true, pagePath: true },
  });

  const anons = new Set<string>();
  const sources = new Map<string, number>();
  const paths = new Map<string, number>();
  for (const v of views) {
    if (v.anonId) anons.add(v.anonId);
    const src = v.utmSource || 'direct';
    sources.set(src, (sources.get(src) ?? 0) + 1);
    paths.set(v.pagePath, (paths.get(v.pagePath) ?? 0) + 1);
  }

  const topN = <K>(m: Map<K, number>, n: number): Array<[K, number]> =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);

  return {
    totalViews: views.length,
    uniqueVisitors: anons.size,
    topSources: topN(sources, 5).map(([source, count]) => ({ source, count })),
    topPages: topN(paths, 5).map(([path, count]) => ({ path, count })),
  };
}
