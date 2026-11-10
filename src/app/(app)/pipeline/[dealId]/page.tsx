import { notFound } from 'next/navigation';
import { withPermission } from '@/lib/permissions';
import { getTenantDb } from '@/lib/prisma-tenant';
import { DealDetailClient } from './deal-detail-client';
import type { DealStatus } from '@/generated/prisma/enums';

interface PageProps {
  params: Promise<{ dealId: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { dealId } = await params;
  return { title: `Deal ${dealId} | VIBE` };
}

export default async function DealDetailPage({ params }: PageProps) {
  const { dealId } = await params;

  const result = await withPermission('deals.view', async () => {
    const db = getTenantDb();

    const deal = await db.deal.findUnique({
      where: { id: dealId },
      include: {
        stage: {
          select: {
            id: true,
            name: true,
            pipeline: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        contact: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        dealActivities: {
          orderBy: { createdAt: 'desc' },
          take: 100,
          select: {
            id: true,
            type: true,
            description: true,
            metadata: true,
            createdAt: true,
            userId: true,
          },
        },
      },
    });

    if (!deal || deal.deletedAt !== null) return null;

    return {
      id: deal.id,
      name: deal.name,
      value: deal.value != null ? Number(deal.value) : null,
      status: deal.status as DealStatus,
      lostReason: deal.lostReason,
      expectedCloseDate: deal.expectedCloseDate
        ? deal.expectedCloseDate.toISOString()
        : null,
      closedAt: deal.closedAt ? deal.closedAt.toISOString() : null,
      stageChangedAt: deal.stageChangedAt.toISOString(),
      createdAt: deal.createdAt.toISOString(),
      updatedAt: deal.updatedAt.toISOString(),
      stage: {
        id: deal.stage.id,
        name: deal.stage.name,
        pipelineId: deal.stage.pipeline.id,
        pipelineName: deal.stage.pipeline.name,
      },
      contact: {
        id: deal.contact.id,
        name: deal.contact.name,
        email: deal.contact.email,
      },
      activities: deal.dealActivities.map((a) => ({
        id: a.id,
        type: a.type,
        description: a.description,
        createdAt: a.createdAt.toISOString(),
      })),
    };
  });

  if (!result) notFound();

  return <DealDetailClient deal={result} />;
}
