import { withPermission } from '@/lib/permissions';
import { getTenantDb } from '@/lib/prisma-tenant';
import { prisma } from '@/lib/prisma';
import { SettingsClient } from './settings-client';
import type { TeamMember, StageRow, EmailTemplateRow, EmailTemplateCategory, AuditLogRow } from './actions';

export const metadata = { title: 'Settings | VIBE' };

export default async function SettingsPage() {
  const data = await withPermission('settings.view', async (ctx) => {
    const db = getTenantDb();

    // Run independent queries in parallel
    const [org, tenantUsers, pipeline, emailTemplates, rawAuditLogs] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: ctx.organizationId },
        select: { name: true, slug: true },
      }),

      db.tenantUser.findMany({
        where: { deletedAt: null },
        include: { role: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      }),

      db.pipeline
        .findFirst({
          where: { isDefault: true },
          include: { stages: { orderBy: { position: 'asc' } } },
        })
        .then(async (p) => {
          if (p) return p;
          return db.pipeline.findFirst({
            orderBy: { createdAt: 'asc' },
            include: { stages: { orderBy: { position: 'asc' } } },
          });
        }),

      db.emailTemplate.findMany({
        orderBy: { createdAt: 'desc' },
      }),

      prisma.auditLog.findMany({
        where: { tenantId: ctx.tenantId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    // Resolve Better Auth user records for name + email (team members + audit log actors)
    const memberUserIds = tenantUsers.map((tu) => tu.userId);
    const auditUserIds = rawAuditLogs.map((l) => l.userId).filter(Boolean) as string[];
    const allUserIds = [...new Set([...memberUserIds, ...auditUserIds])];

    const users =
      allUserIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: allUserIds } },
            select: { id: true, name: true, email: true },
          })
        : [];

    const userMap = new Map(users.map((u) => [u.id, u]));

    const members: TeamMember[] = tenantUsers.map((tu) => {
      const u = userMap.get(tu.userId);
      return {
        id: tu.id,
        userId: tu.userId,
        name: u?.name ?? 'Unknown',
        email: u?.email ?? '',
        roleName: tu.role.name,
        joinedAt: tu.createdAt.toISOString(),
      };
    });

    const stages: StageRow[] = pipeline
      ? pipeline.stages.map((s) => ({
          id: s.id,
          name: s.name,
          position: s.position,
          pipelineId: s.pipelineId,
        }))
      : [];

    const templates: EmailTemplateRow[] = emailTemplates.map((t) => ({
      id: t.id,
      name: t.name,
      subject: t.subject,
      body: t.body,
      category: t.category as EmailTemplateCategory,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    const auditLogs: AuditLogRow[] = rawAuditLogs.map((l) => {
      const u = l.userId ? userMap.get(l.userId) : undefined;
      return {
        id: l.id,
        action: l.action,
        entity: l.entity,
        entityId: l.entityId,
        metadata: (l.metadata as Record<string, unknown> | null) ?? null,
        userId: l.userId,
        userName: u?.name ?? null,
        userEmail: u?.email ?? null,
        createdAt: l.createdAt.toISOString(),
      };
    });

    // settings.edit is Owner-only per RBAC
    const canEdit = await prisma.permission
      .findUnique({
        where: {
          roleId_resource_action: {
            roleId: ctx.roleId,
            resource: 'settings',
            action: 'edit',
          },
        },
      })
      .then((p) => p !== null);

    return {
      profile: {
        name: ctx.user.name,
        email: ctx.user.email,
        roleName: ctx.roleName,
        orgName: org?.name ?? 'Unknown',
        orgSlug: org?.slug ?? '',
        tenantId: ctx.tenantId,
        memberCount: tenantUsers.length,
        canEdit,
      },
      members,
      stages,
      pipelineId: pipeline?.id ?? null,
      templates,
      auditLogs,
    };
  });

  return (
    <SettingsClient
      profile={data.profile}
      initialMembers={data.members}
      initialStages={data.stages}
      pipelineId={data.pipelineId}
      initialTemplates={data.templates}
      initialAuditLogs={data.auditLogs}
    />
  );
}
