import { prisma } from './prisma';
import type { CommissionSource } from '../generated/prisma/enums';
import type { SplitRow } from './commission-splits-meta';

export * from './commission-splits-meta';

/**
 * List splits for a given deal, resolving payee labels through contact / user /
 * entity lookups. Tenant-scoped.
 */
export async function listDealSplits(tenantId: string, dealId: string): Promise<SplitRow[]> {
  const rows = await prisma.commissionSplit.findMany({
    where: { tenantId, dealId },
    orderBy: { createdAt: 'asc' },
  });

  const [users, contacts, entities] = await Promise.all([
    prisma.user.findMany({
      where: {
        id: { in: rows.filter((r) => r.payeeUserId).map((r) => r.payeeUserId!) },
      },
      select: { id: true, name: true, email: true },
    }),
    prisma.contact.findMany({
      where: {
        tenantId,
        id: { in: rows.filter((r) => r.payeeContactId).map((r) => r.payeeContactId!) },
      },
      select: { id: true, name: true, email: true },
    }),
    prisma.businessEntity.findMany({
      where: {
        tenantId,
        id: { in: rows.filter((r) => r.payeeEntityId).map((r) => r.payeeEntityId!) },
      },
      select: { id: true, name: true },
    }),
  ]);

  const userMap = new Map(users.map((u) => [u.id, u.name || u.email]));
  const contactMap = new Map(contacts.map((c) => [c.id, c.name]));
  const entityMap = new Map(entities.map((e) => [e.id, e.name]));

  return rows.map((r) => {
    let label = '';
    if (r.payeeType === 'user' && r.payeeUserId) label = userMap.get(r.payeeUserId) ?? 'Unknown user';
    else if (r.payeeType === 'contact' && r.payeeContactId) label = contactMap.get(r.payeeContactId) ?? 'Unknown contact';
    else if (r.payeeType === 'entity' && r.payeeEntityId) label = entityMap.get(r.payeeEntityId) ?? 'Unknown entity';

    return {
      id: r.id,
      dealId: r.dealId,
      source: r.source,
      payeeType: r.payeeType,
      payeeUserId: r.payeeUserId,
      payeeContactId: r.payeeContactId,
      payeeEntityId: r.payeeEntityId,
      payeeLabel: label,
      percentBps: r.percentBps,
      amountCents: Number(r.amountCents),
      paidAt: r.paidAt?.toISOString() ?? null,
      note: r.note,
      createdAt: r.createdAt.toISOString(),
    };
  });
}

/**
 * Resolve the pipeline kind for a deal and map it to the CommissionSource enum.
 */
export async function deriveSourceForDeal(
  tenantId: string,
  dealId: string
): Promise<CommissionSource> {
  const deal = await prisma.deal.findFirst({
    where: { id: dealId, tenantId },
    include: { stage: { include: { pipeline: { select: { kind: true } } } } },
  });
  if (!deal) return 'other';
  const kind = deal.stage.pipeline.kind;
  switch (kind) {
    case 'real_estate':
      return 'real_estate';
    case 'mortgage':
      return 'mortgage';
    case 'insurance':
      return 'insurance';
    case 'investment':
      return 'investment';
    default:
      return 'other';
  }
}
