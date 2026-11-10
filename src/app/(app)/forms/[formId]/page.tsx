import { notFound } from 'next/navigation';
import { withPermission } from '@/lib/permissions';
import { getTenantDb } from '@/lib/prisma-tenant';
import { FormDetailClient } from './form-detail-client';

interface Props {
  params: Promise<{ formId: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { formId } = await params;
  try {
    const form = await withPermission('forms.view', async () => {
      const db = getTenantDb();
      return db.form.findUnique({ where: { id: formId }, select: { name: true } });
    });
    return { title: form ? `${form.name} | Forms | VIBE` : 'Form | VIBE' };
  } catch {
    return { title: 'Form | VIBE' };
  }
}

export default async function FormDetailPage({ params }: Props) {
  const { formId } = await params;

  const data = await withPermission('forms.view', async () => {
    const db = getTenantDb();

    const [form, sequences] = await Promise.all([
      db.form.findUnique({
        where: { id: formId },
        select: {
          id: true,
          name: true,
          active: true,
          defaultSequenceId: true,
          createdAt: true,
          fields: {
            select: {
              id: true,
              label: true,
              type: true,
              required: true,
              position: true,
            },
            orderBy: { position: 'asc' },
          },
          _count: {
            select: { submissions: true },
          },
        },
      }),
      db.sequence.findMany({
        where: { status: 'active' },
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      }),
    ]);

    if (!form) return null;

    const submissions = await db.formSubmission.findMany({
      where: { formId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        payloadJson: true,
        ipAddress: true,
        createdAt: true,
        contactId: true,
      },
    });

    return {
      form: {
        id: form.id,
        name: form.name,
        active: form.active,
        defaultSequenceId: form.defaultSequenceId,
        createdAt: form.createdAt.toISOString(),
        submissionCount: form._count.submissions,
        fields: form.fields,
      },
      submissions: submissions.map((s) => ({
        id: s.id,
        payloadJson: s.payloadJson as Record<string, unknown>,
        ipAddress: s.ipAddress ?? null,
        contactId: s.contactId ?? null,
        createdAt: s.createdAt.toISOString(),
      })),
      sequences,
    };
  });

  if (!data) notFound();

  return (
    <FormDetailClient
      form={data.form}
      submissions={data.submissions}
      sequences={data.sequences}
    />
  );
}
