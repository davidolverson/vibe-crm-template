import { notFound } from 'next/navigation';
import { withPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { listDealSplits } from '@/lib/commission-splits';
import { SplitsClient } from './splits-client';

export const metadata = { title: 'Commission splits | VIBE' };

interface Params {
  params: Promise<{ dealId: string }>;
}

export default async function DealSplitsPage({ params }: Params) {
  const { dealId } = await params;

  const data = await withPermission('deals.view', async (ctx) => {
    const deal = await prisma.deal.findFirst({
      where: { id: dealId, tenantId: ctx.tenantId },
      select: {
        id: true,
        name: true,
        value: true,
        contact: { select: { name: true } },
        stage: { include: { pipeline: { select: { name: true, kind: true } } } },
      },
    });
    if (!deal) return null;

    const [splits, memberRows, contacts, entities, canEditPerm] = await Promise.all([
      listDealSplits(ctx.tenantId, dealId),
      prisma.tenantUser.findMany({
        where: { tenantId: ctx.tenantId, deletedAt: null },
        select: { userId: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.contact.findMany({
        where: { tenantId: ctx.tenantId, deletedAt: null },
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
        take: 200,
      }),
      prisma.businessEntity.findMany({
        where: { tenantId: ctx.tenantId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      prisma.permission.findUnique({
        where: {
          roleId_resource_action: {
            roleId: ctx.roleId,
            resource: 'deals',
            action: 'edit',
          },
        },
      }),
    ]);

    const userIds = memberRows.map((m) => m.userId);
    const userRows = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })
      : [];

    return {
      deal: {
        id: deal.id,
        name: deal.name,
        value: deal.value ? Number(deal.value) : 0,
        contactName: deal.contact?.name ?? 'Unknown',
        pipelineName: deal.stage.pipeline.name,
      },
      splits,
      users: userRows.map((u) => ({
        id: u.id,
        label: u.name || u.email,
      })),
      contacts: contacts.map((c) => ({
        id: c.id,
        label: c.name + (c.email ? ` · ${c.email}` : ''),
      })),
      entities: entities.map((e) => ({ id: e.id, label: e.name })),
      canEdit: !!canEditPerm,
    };
  });

  if (!data) notFound();

  return (
    <SplitsClient
      deal={data.deal}
      splits={data.splits}
      users={data.users}
      contacts={data.contacts}
      entities={data.entities}
      canEdit={data.canEdit}
    />
  );
}
