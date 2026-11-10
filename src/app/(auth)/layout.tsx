import type { Metadata } from 'next';
import { ListingRoomShell } from '@/components/auth/listing-room-shell';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <ListingRoomShell caption="Listing Room" footnote="No. 01 · Member Entry">
      {children}
    </ListingRoomShell>
  );
}
