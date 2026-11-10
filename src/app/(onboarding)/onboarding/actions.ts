'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth-server';
import { provisionTenant } from '@/lib/tenant-provision';
import { trySendEmail } from '@/lib/email-sender';
import { welcomeEmail } from '@/lib/email-templates';

export async function provisionWorkspace(organizationId: string, name: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { error: 'Not authenticated' };
  }

  try {
    await provisionTenant({
      organizationId,
      name,
      createdByUserId: session.user.id,
    });

    // Fire-and-forget welcome email -- never blocks provisioning
    const userName = session.user.name || 'there';
    const userEmail = session.user.email;
    if (userEmail) {
      const template = welcomeEmail(userName);
      void trySendEmail({
        tenantId: organizationId, // provisioning uses orgId as tenantId key
        to: userEmail,
        subject: template.subject,
        htmlBody: template.htmlBody,
        textBody: template.textBody,
        tag: 'welcome',
      });
    }

    return { success: true };
  } catch (err) {
    console.error('Failed to provision tenant:', err);
    return { error: 'Failed to create workspace. Please try again.' };
  }
}
