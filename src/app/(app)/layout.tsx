import { redirect } from 'next/navigation';
import { getAuthContext } from '@/lib/auth';
import { Sidebar } from '@/components/layout/sidebar';
import { GlobalSearch } from '@/components/layout/global-search';
import { ServiceWorkerRegister } from '@/components/layout/service-worker-register';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let ctx;
  try {
    ctx = await getAuthContext();
  } catch {
    redirect('/sign-in');
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <ServiceWorkerRegister />
      <Sidebar
        userName={ctx.user.name}
        userEmail={ctx.user.email}
        roleName={ctx.roleName}
      />
      {/*
        Main area: takes all remaining width.
        On mobile there is no persistent sidebar, so this is the full viewport.
      */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {/*
          Top bar: on mobile we add left padding to clear the fixed hamburger button
          (w-9 + left-3 + a little breathing room = pl-14).
          On md+ the sidebar is in the flow so no offset is needed.
        */}
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 backdrop-blur px-4 md:px-6 py-3 pl-14 md:pl-6">
          <GlobalSearch />
        </div>
        {/* Tighter padding on very small screens */}
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
