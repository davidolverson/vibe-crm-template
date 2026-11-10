import Link from 'next/link';
import { withPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { IdxSettingsClient } from './idx-client';
import type { IdxConfig } from './actions';

export const metadata = { title: 'IDX | VIBE Settings' };

const DEFAULT: IdxConfig = { vendor: '', widgetCode: '', disclaimer: '' };

export default async function IdxSettingsPage() {
  const data = await withPermission('settings.view', async (ctx) => {
    const [row, canEdit] = await Promise.all([
      prisma.tenantIdxConfig.findUnique({ where: { tenantId: ctx.tenantId } }),
      prisma.permission.findUnique({
        where: {
          roleId_resource_action: {
            roleId: ctx.roleId,
            resource: 'settings',
            action: 'edit',
          },
        },
      }),
    ]);

    const cfg: IdxConfig = row
      ? {
          vendor: (row.vendor as IdxConfig['vendor']) ?? '',
          widgetCode: row.widgetCode,
          disclaimer: row.disclaimer,
        }
      : DEFAULT;

    return { cfg, canEdit: !!canEdit };
  });

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-8">
      <div>
        <Link href="/settings" className="text-sm text-zinc-500 hover:text-[#D4A017]">
          &larr; Back to Settings
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">IDX</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Pick your IDX vendor and paste the widget code. VIBE embeds it on any Site page with an IDX block.
        </p>
      </div>

      <IdxSettingsClient initial={data.cfg} canEdit={data.canEdit} />
    </div>
  );
}
