import { withPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { SequencesClient } from './sequences-client';

export const metadata = { title: 'Sequences | VIBE' };

export default async function SequencesPage() {
  const data = await withPermission('sequences.view', async (ctx) => {
    const [sequences, templates, canEdit] = await Promise.all([
      prisma.sequence.findMany({
        where: { tenantId: ctx.tenantId },
        orderBy: { createdAt: 'desc' },
        include: {
          steps: { orderBy: { stepOrder: 'asc' }, include: { template: true } },
          _count: { select: { enrollments: true } },
        },
      }),
      prisma.emailTemplate.findMany({
        where: { tenantId: ctx.tenantId },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, subject: true },
      }),
      prisma.permission.findUnique({
        where: {
          roleId_resource_action: {
            roleId: ctx.roleId,
            resource: 'sequences',
            action: 'create',
          },
        },
      }),
    ]);

    return {
      sequences: sequences.map((s) => ({
        id: s.id,
        name: s.name,
        status: s.status,
        enrollmentCount: s._count.enrollments,
        createdAt: s.createdAt.toISOString(),
        steps: s.steps.map((step) => ({
          id: step.id,
          stepOrder: step.stepOrder,
          type: step.type,
          delayDays: step.delayDays,
          delayHours: step.delayHours,
          templateName: step.template?.name ?? null,
          smsBody: step.smsBody,
        })),
      })),
      templates,
      canEdit: !!canEdit,
    };
  });

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Sequences</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Drip campaigns that send emails and SMS to enrolled contacts on a schedule. The worker runs daily.
        </p>
      </div>
      <SequencesClient
        sequences={data.sequences}
        templates={data.templates}
        canEdit={data.canEdit}
      />
    </div>
  );
}
