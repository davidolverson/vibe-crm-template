import { prisma } from './prisma';

export interface HouseholdMemberSummary {
  contactId: string;
  name: string;
  role: string;
}

export interface HouseholdLineOfBusiness {
  source: 'real_estate' | 'mortgage' | 'insurance' | 'investment' | 'other';
  dealCount: number;
  openValueCents: number; // sum of deal.value * 100 for status=open
  wonValueCents: number; // sum of deal.value * 100 for status=won
  commissionCents: number; // sum of split.amountCents for this source
}

export interface HouseholdSummary {
  householdId: string | null;
  householdName: string | null;
  members: HouseholdMemberSummary[];
  lines: HouseholdLineOfBusiness[];
  totalLtvCents: number;
}

/**
 * Given a contact, find its household (via HouseholdMember) and roll up
 * cross-line-of-business metrics: deals + commission splits across every
 * contact in the household.
 *
 * Returns a summary with members, per-source aggregates, and total LTV.
 * If the contact is not in a household, returns a summary with just that
 * one contact's deals and an empty members array.
 */
export async function getHouseholdSummaryForContact(
  tenantId: string,
  contactId: string
): Promise<HouseholdSummary> {
  const membership = await prisma.householdMember.findFirst({
    where: { tenantId, contactId },
    include: {
      household: {
        include: {
          members: {
            include: { /* contact join done manually below to avoid Prisma relation */ },
          },
        },
      },
    },
  });

  let memberContactIds: string[] = [contactId];
  let householdId: string | null = null;
  let householdName: string | null = null;
  let members: HouseholdMemberSummary[] = [];

  if (membership) {
    householdId = membership.householdId;
    householdName = membership.household.name;
    memberContactIds = membership.household.members.map((m) => m.contactId);

    const contactRows = await prisma.contact.findMany({
      where: { tenantId, id: { in: memberContactIds } },
      select: { id: true, name: true },
    });
    const nameById = new Map(contactRows.map((c) => [c.id, c.name]));
    members = membership.household.members.map((m) => ({
      contactId: m.contactId,
      name: nameById.get(m.contactId) ?? 'Unknown',
      role: m.role,
    }));
  }

  // Aggregate deals by pipeline kind
  const deals = await prisma.deal.findMany({
    where: { tenantId, contactId: { in: memberContactIds } },
    include: { stage: { include: { pipeline: { select: { kind: true } } } } },
  });

  const splits = await prisma.commissionSplit.findMany({
    where: { tenantId, dealId: { in: deals.map((d) => d.id) } },
  });

  const sourceMap = new Map<HouseholdLineOfBusiness['source'], HouseholdLineOfBusiness>();
  function bump(source: HouseholdLineOfBusiness['source']): HouseholdLineOfBusiness {
    let row = sourceMap.get(source);
    if (!row) {
      row = {
        source,
        dealCount: 0,
        openValueCents: 0,
        wonValueCents: 0,
        commissionCents: 0,
      };
      sourceMap.set(source, row);
    }
    return row;
  }

  for (const d of deals) {
    const kind = d.stage.pipeline.kind;
    const source = (kind === 'real_estate' || kind === 'mortgage' || kind === 'insurance' || kind === 'investment'
      ? kind
      : 'other') as HouseholdLineOfBusiness['source'];
    const row = bump(source);
    row.dealCount++;
    const valueCents = d.value ? Math.round(Number(d.value) * 100) : 0;
    if (d.status === 'won') row.wonValueCents += valueCents;
    else if (d.status === 'open') row.openValueCents += valueCents;
  }

  for (const s of splits) {
    const row = bump(s.source as HouseholdLineOfBusiness['source']);
    row.commissionCents += Number(s.amountCents);
  }

  const lines = Array.from(sourceMap.values()).sort((a, b) => b.wonValueCents - a.wonValueCents);

  const totalLtvCents = lines.reduce(
    (sum, l) => sum + l.wonValueCents + l.commissionCents,
    0
  );

  return {
    householdId,
    householdName,
    members,
    lines,
    totalLtvCents,
  };
}
