import { withPermission } from '@/lib/permissions';
import { getTenantDb } from '@/lib/prisma-tenant';
import { DashboardClient } from './dashboard-client';

export const metadata = { title: 'Dashboard | VIBE' };

export default async function DashboardPage() {
  const data = await withPermission('dashboard.view', async () => {
    const db = getTenantDb();
    const now = new Date();

    // Week boundaries: Monday 00:00 through Sunday 23:59:59 in local time
    const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(now.getDate() - daysFromMonday);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const [
      contactCount,
      dealCount,
      overdueTaskCount,
      taskCount,
      formCount,
      submissionCount,
      pipelineValue,
      recentActivities,
      pipelineStageDeals,
      contactStatusGroups,
      weeklyTasks,
    ] = await Promise.all([
      db.contact.count(),
      db.deal.count({ where: { status: 'open' } }),
      db.task.count({
        where: {
          status: 'pending',
          dueAt: { lt: now },
        },
      }),
      db.task.count(),
      db.form.count(),
      db.formSubmission.count(),
      db.deal.aggregate({
        where: { status: 'open' },
        _sum: { value: true },
      }),
      db.activity.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          contact: {
            select: { name: true },
          },
        },
      }),
      // Pipeline stage distribution: open deals grouped by stage
      db.deal.findMany({
        where: { status: 'open' },
        select: {
          stageId: true,
          stage: {
            select: { name: true, position: true },
          },
        },
      }),
      // Contact status distribution
      db.contact.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      // Tasks due this week (Mon-Sun)
      db.task.findMany({
        where: {
          dueAt: {
            gte: weekStart,
            lt: weekEnd,
          },
        },
        select: { dueAt: true },
      }),
    ]);

    // Aggregate pipeline stage counts and sort by stage position
    const stageCounts = new Map<string, { name: string; position: number; count: number }>();
    for (const deal of pipelineStageDeals) {
      const existing = stageCounts.get(deal.stageId);
      if (existing) {
        existing.count += 1;
      } else {
        stageCounts.set(deal.stageId, {
          name: deal.stage.name,
          position: deal.stage.position,
          count: 1,
        });
      }
    }
    const pipelineDistribution = Array.from(stageCounts.values()).sort(
      (a, b) => a.position - b.position
    );

    // Contact status distribution - map to typed objects
    const contactDistribution = contactStatusGroups.map((g) => ({
      status: g.status as string,
      count: g._count.id,
    }));

    // Bucket tasks-due-this-week by day index 0-6 (Mon=0 ... Sun=6)
    const tasksByDay: number[] = [0, 0, 0, 0, 0, 0, 0];
    for (const task of weeklyTasks) {
      if (!task.dueAt) continue;
      const d = task.dueAt.getDay(); // 0=Sun ... 6=Sat
      const idx = d === 0 ? 6 : d - 1; // convert to Mon=0 ... Sun=6
      tasksByDay[idx] += 1;
    }

    return {
      contactCount,
      dealCount,
      overdueTaskCount,
      taskCount,
      formCount,
      submissionCount,
      pipelineValue: Number(pipelineValue._sum.value ?? 0),
      recentActivities: recentActivities.map((a) => ({
        id: a.id,
        type: a.type,
        body: a.body ?? null,
        createdAt: a.createdAt.toISOString(),
        contactName: a.contact.name,
      })),
      pipelineDistribution,
      contactDistribution,
      tasksByDay,
      weekStartIso: weekStart.toISOString(),
    };
  });

  return <DashboardClient data={data} />;
}
