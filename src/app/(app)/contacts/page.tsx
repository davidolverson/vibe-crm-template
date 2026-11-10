import { withPermission } from '@/lib/permissions';
import { getTenantDb } from '@/lib/prisma-tenant';
import { ContactsClient } from './contacts-client';
import type { ContactStatus } from '@/generated/prisma/enums';

export const metadata = { title: 'Contacts | VIBE' };

const PAGE_SIZE = 25;

interface SearchParams {
  page?: string;
  search?: string;
  status?: string;
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);
  const search = searchParams.search?.trim() ?? '';
  const statusParam = searchParams.status ?? '';

  const result = await withPermission('contacts.view', async () => {
    const db = getTenantDb();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = {
      deletedAt: null,
    };

    if (search !== '') {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (statusParam !== '' && statusParam !== 'all') {
      where.status = statusParam;
    }

    const skip = (page - 1) * PAGE_SIZE;

    const [rows, total] = await Promise.all([
      db.contact.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: PAGE_SIZE,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          company: true,
          status: true,
          createdAt: true,
        },
      }),
      db.contact.count({ where }),
    ]);

    return {
      contacts: rows.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        company: c.company,
        status: c.status as ContactStatus,
        createdAt: c.createdAt.toISOString(),
      })),
      total,
    };
  });

  return (
    <ContactsClient
      contacts={result.contacts}
      total={result.total}
      page={page}
      pageSize={PAGE_SIZE}
    />
  );
}
