'use server';

import { withPermission } from '@/lib/permissions';
import { getTenantDb } from '@/lib/prisma-tenant';

export type SearchContact = {
  id: string;
  name: string | null;
  email: string | null;
  company: string | null;
};

export type SearchDeal = {
  id: string;
  name: string;
};

export type SearchTask = {
  id: string;
  title: string;
  status: string;
};

export type GlobalSearchResult = {
  contacts: SearchContact[];
  deals: SearchDeal[];
  tasks: SearchTask[];
};

export async function searchGlobal(query: string): Promise<GlobalSearchResult> {
  const trimmed = query.trim();

  if (trimmed.length < 2) {
    return { contacts: [], deals: [], tasks: [] };
  }

  try {
    return await withPermission('contacts.view', async () => {
      const db = getTenantDb();
      const pattern = `%${trimmed}%`;

      const [contacts, deals, tasks] = await Promise.all([
        db.contact.findMany({
          where: {
            deletedAt: null,
            OR: [
              { name: { contains: trimmed, mode: 'insensitive' } },
              { email: { contains: trimmed, mode: 'insensitive' } },
            ],
          },
          select: { id: true, name: true, email: true, company: true },
          take: 5,
          orderBy: { createdAt: 'desc' },
        }),
        db.deal.findMany({
          where: {
            deletedAt: null,
            name: { contains: trimmed, mode: 'insensitive' },
          },
          select: { id: true, name: true },
          take: 5,
          orderBy: { createdAt: 'desc' },
        }),
        db.task.findMany({
          where: {
            title: { contains: trimmed, mode: 'insensitive' },
          },
          select: { id: true, title: true, status: true },
          take: 5,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      // Silence unused variable warning -- pattern is for future raw SQL fallback
      void pattern;

      return {
        contacts: contacts as SearchContact[],
        deals: deals as SearchDeal[],
        tasks: tasks.map((t) => ({ ...t, status: String(t.status) })),
      };
    });
  } catch {
    return { contacts: [], deals: [], tasks: [] };
  }
}
