import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { requirePlatformAdmin } from '@/lib/platform-admin';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Throws notFound() if the current session is not in ADMIN_EMAILS.
  await requirePlatformAdmin();

  return <div className="min-h-screen bg-[#09090B] text-[#FAFAFA]">{children}</div>;
}
