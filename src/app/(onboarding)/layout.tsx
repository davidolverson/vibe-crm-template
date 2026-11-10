import type { Metadata } from 'next';
import { ListingRoomShell } from '@/components/auth/listing-room-shell';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <ListingRoomShell caption="Opening Hours" footnote="No. 02 · Brokerage">
      {children}
    </ListingRoomShell>
  );
}
