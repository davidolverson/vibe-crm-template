import { notFound } from 'next/navigation';
import { withPermission } from '@/lib/permissions';
import { getSite } from '@/lib/sites';
import { SiteDetailClient } from './site-detail-client';

export const metadata = { title: 'Site | VIBE' };

interface Params {
  params: Promise<{ id: string }>;
}

export default async function SiteDetailPage({ params }: Params) {
  const { id } = await params;

  const data = await withPermission('sites.view', async (ctx) => {
    const site = await getSite(ctx.tenantId, id);
    return { site };
  });

  if (!data.site) notFound();

  return <SiteDetailClient site={data.site} />;
}
