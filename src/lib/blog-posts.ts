import { prisma } from './prisma';

export async function getPublishedBlogPost(siteId: string, slug: string) {
  return prisma.blogPost.findFirst({
    where: { siteId, slug, status: 'published' },
  });
}

export async function listRelatedPosts(siteId: string, excludeId: string, limit = 3) {
  return prisma.blogPost.findMany({
    where: { siteId, status: 'published', NOT: { id: excludeId } },
    orderBy: { publishedAt: 'desc' },
    take: limit,
    select: { id: true, slug: true, title: true, excerpt: true, publishedAt: true, author: true },
  });
}
