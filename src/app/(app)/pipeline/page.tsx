import { withPermission } from '@/lib/permissions';
import { getTenantDb } from '@/lib/prisma-tenant';
import { PipelineClient } from './pipeline-client';

export const metadata = { title: 'Pipeline | VIBE' };

export default async function PipelinePage() {
  const pipeline = await withPermission('pipeline.view', async () => {
    const db = getTenantDb();
    // Prefer the flagged default; fall back to the first pipeline so that
    // tenants provisioned before the isDefault fix are not broken.
    const defaultPipeline = await db.pipeline.findFirst({
      where: { isDefault: true },
      include: {
        stages: {
          orderBy: { position: 'asc' },
          include: {
            deals: {
              where: { status: 'open', deletedAt: null },
              include: { contact: { select: { name: true } } },
              orderBy: { stageChangedAt: 'desc' },
            },
          },
        },
      },
    });

    if (defaultPipeline) return defaultPipeline;

    return db.pipeline.findFirst({
      orderBy: { createdAt: 'asc' },
      include: {
        stages: {
          orderBy: { position: 'asc' },
          include: {
            deals: {
              where: { status: 'open', deletedAt: null },
              include: { contact: { select: { name: true } } },
              orderBy: { stageChangedAt: 'desc' },
            },
          },
        },
      },
    });
  });

  // Fetch contacts for the deal form picker
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

  if (!pipeline) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-zinc-400">No pipeline configured</p>
          <p className="mt-1 text-sm text-zinc-500">
            Contact your administrator to set up a default pipeline.
          </p>
        </div>
      </div>
    );
  }

  const serialized = {
    id: pipeline.id,
    name: pipeline.name,
    stages: pipeline.stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      position: stage.position,
      deals: stage.deals.map((deal) => ({
        id: deal.id,
        name: deal.name,
        contactName: deal.contact?.name ?? null,
        value: deal.value ? Number(deal.value) : null,
        stageChangedAt: deal.stageChangedAt
          ? deal.stageChangedAt.toISOString()
          : deal.createdAt.toISOString(),
        status: deal.status,
        expectedCloseDate: deal.expectedCloseDate
          ? deal.expectedCloseDate.toISOString().slice(0, 10)
          : null,
      })),
    })),
  };

  return <PipelineClient pipeline={serialized} contacts={contacts} />;
}
