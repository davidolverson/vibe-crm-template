import { notFound } from 'next/navigation';
import { withPermission } from '@/lib/permissions';
import { getTenantDb } from '@/lib/prisma-tenant';
import { ContactDetailClient } from './contact-detail-client';
import { HouseholdPanel } from '@/components/contacts/household-panel';
import { MessagesPanel } from '@/components/contacts/messages-panel';
import type { ContactStatus, DealStatus, TaskStatus } from '@/generated/prisma/enums';
import type { ActivityType } from '@/generated/prisma/enums';

interface PageProps {
  params: Promise<{ contactId: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { contactId } = await params;
  return { title: `Contact ${contactId} | VIBE` };
}

export default async function ContactDetailPage({ params }: PageProps) {
  const { contactId } = await params;

  const result = await withPermission('contacts.view', async (ctx) => {
    const db = getTenantDb();
    const tenantId = ctx.tenantId;

    const [contact, deals, tasks] = await Promise.all([
      db.contact.findUnique({
        where: { id: contactId },
        include: {
          activities: {
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: {
              id: true,
              type: true,
              body: true,
              createdAt: true,
            },
          },
          tags: {
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              tag: true,
            },
          },
        },
      }),
      db.deal.findMany({
        where: { contactId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          value: true,
          status: true,
          createdAt: true,
          stage: {
            select: { id: true, name: true },
          },
        },
      }),
      db.task.findMany({
        where: { contactId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          priority: true,
          status: true,
          dueAt: true,
          createdAt: true,
        },
      }),
    ]);

    if (!contact || contact.deletedAt !== null) return null;

    return {
      tenantId,
      id: contact.id,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      smsOptOut: contact.smsOptOut,
      company: contact.company,
      status: contact.status as ContactStatus,
      source: contact.source,
      createdAt: contact.createdAt.toISOString(),
      activities: contact.activities.map((a) => ({
        id: a.id,
        type: a.type as ActivityType,
        body: a.body,
        createdAt: a.createdAt.toISOString(),
      })),
      tags: contact.tags.map((t) => ({ id: t.id, tag: t.tag })),
      deals: deals.map((d) => ({
        id: d.id,
        name: d.name,
        value: d.value !== null ? d.value.toString() : null,
        status: d.status as DealStatus,
        stageName: d.stage.name,
        createdAt: d.createdAt.toISOString(),
      })),
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        priority: (t.priority ?? 'medium') as string,
        status: t.status as TaskStatus,
        dueAt: t.dueAt ? t.dueAt.toISOString() : null,
        createdAt: t.createdAt.toISOString(),
      })),
    };
  });

  if (!result) notFound();

  return (
    <div className="space-y-6">
      <ContactDetailClient contact={result} />
      <div className="max-w-3xl space-y-6">
        <MessagesPanel tenantId={result.tenantId} contactId={result.id} />
        <HouseholdPanel tenantId={result.tenantId} contactId={result.id} />
      </div>
    </div>
  );
}
