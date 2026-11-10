import { notFound } from 'next/navigation';
import { withPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { getPage, parseBlocks } from '@/lib/sites';
import { PageEditorClient } from './page-editor-client';

export const metadata = { title: 'Edit page | VIBE' };

interface Params {
  params: Promise<{ id: string; pageId: string }>;
}

export default async function PageEditor({ params }: Params) {
  const { id: siteId, pageId } = await params;

  const data = await withPermission('sites.view', async (ctx) => {
    const [page, forms] = await Promise.all([
      getPage(ctx.tenantId, siteId, pageId),
      prisma.form.findMany({
        where: { tenantId: ctx.tenantId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true },
      }),
    ]);
    return { page, forms };
  });

  if (!data.page) notFound();

  const blocks = parseBlocks(data.page.content);

  return (
    <PageEditorClient
      siteId={siteId}
      pageId={pageId}
      siteSlug={data.page.site.slug}
      pageTitle={data.page.title}
      pageSlug={data.page.slug}
      published={data.page.published}
      initialBlocks={blocks}
      forms={data.forms}
    />
  );
}
