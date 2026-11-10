import { withPermission } from '@/lib/permissions';
import { getTenantDb } from '@/lib/prisma-tenant';
import { FormsClient } from './forms-client';

export const metadata = { title: 'Forms | VIBE' };

export default async function FormsPage() {
  const forms = await withPermission('forms.view', async () => {
    const db = getTenantDb();
    const rows = await db.form.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        active: true,
        createdAt: true,
        _count: {
          select: { submissions: true, fields: true },
        },
      },
    });

    return rows.map((f) => ({
      id: f.id,
      name: f.name,
      active: f.active,
      createdAt: f.createdAt.toISOString(),
      submissionCount: f._count.submissions,
      fieldCount: f._count.fields,
    }));
  });

  return <FormsClient forms={forms} />;
}
