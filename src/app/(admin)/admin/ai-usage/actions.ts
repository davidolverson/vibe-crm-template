'use server';

import { revalidatePath } from 'next/cache';
import { requirePlatformAdmin } from '@/lib/platform-admin';
import { prisma } from '@/lib/prisma';

export async function toggleAiKillSwitch(next: boolean, note: string): Promise<{ ok: boolean }> {
  const admin = await requirePlatformAdmin();

  await prisma.systemFlag.upsert({
    where: { key: 'AI_GLOBAL_KILL' },
    create: {
      key: 'AI_GLOBAL_KILL',
      boolValue: next,
      note: note || (next ? 'Disabled by admin' : 'Re-enabled by admin'),
      updatedBy: admin.email,
    },
    update: {
      boolValue: next,
      note: note || (next ? 'Disabled by admin' : 'Re-enabled by admin'),
      updatedBy: admin.email,
    },
  });

  revalidatePath('/admin/ai-usage');
  return { ok: true };
}
