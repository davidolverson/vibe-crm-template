import Link from 'next/link';
import { withPermission } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { TwilioSettingsClient } from './twilio-client';

export const metadata = { title: 'Twilio | VIBE Settings' };

export default async function TwilioSettingsPage() {
  const data = await withPermission('settings.view', async (ctx) => {
    const [config, phones] = await Promise.all([
      prisma.tenantTwilioConfig.findUnique({
        where: { tenantId: ctx.tenantId },
        select: { id: true, createdAt: true, twimlAppSid: true },
      }),
      prisma.tenantPhoneNumber.findMany({
        where: { tenantId: ctx.tenantId },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          phoneNumber: true,
          twilioSid: true,
          friendlyName: true,
          isDefault: true,
          createdAt: true,
        },
      }),
    ]);

    const canEdit = await prisma.permission.findUnique({
      where: {
        roleId_resource_action: {
          roleId: ctx.roleId,
          resource: 'settings',
          action: 'edit',
        },
      },
    });

    return {
      connected: !!config,
      twimlAppSid: config?.twimlAppSid ?? null,
      phones: phones.map((p) => ({
        id: p.id,
        phoneNumber: p.phoneNumber,
        twilioSid: p.twilioSid,
        friendlyName: p.friendlyName,
        isDefault: p.isDefault,
        createdAt: p.createdAt.toISOString(),
      })),
      canEdit: !!canEdit,
    };
  });

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-8">
      <div>
        <Link href="/settings" className="text-sm text-zinc-500 hover:text-[#D4A017]">
          &larr; Back to Settings
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Twilio</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Connect your Twilio account to send SMS and place calls from VIBE. Register your brand and campaign
          for A2P 10DLC compliance in the{' '}
          <a
            href="https://console.twilio.com/us1/develop/sms/regulatory-compliance/a2p-messaging"
            target="_blank"
            rel="noreferrer"
            className="text-[#D4A017] underline-offset-4 hover:underline"
          >
            Twilio console
          </a>
          .
        </p>
      </div>

      <TwilioSettingsClient
        connected={data.connected}
        twimlAppSid={data.twimlAppSid}
        phones={data.phones}
        canEdit={data.canEdit}
      />
    </div>
  );
}
