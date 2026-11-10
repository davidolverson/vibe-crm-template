'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Kanban,
  CheckSquare,
  FileText,
  Globe,
  Mail,
  Zap,
  DollarSign,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { signOut } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/layout/notification-bell';

interface SidebarProps {
  userName: string;
  userEmail: string;
  roleName: string;
}

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Contacts', href: '/contacts', icon: Users },
  { label: 'Pipeline', href: '/pipeline', icon: Kanban },
  { label: 'Tasks', href: '/tasks', icon: CheckSquare },
  { label: 'Forms', href: '/forms', icon: FileText },
  { label: 'Sites', href: '/sites', icon: Globe },
  { label: 'Sequences', href: '/sequences', icon: Mail },
  { label: 'Automations', href: '/automations', icon: Zap },
  { label: 'CFO', href: '/cfo', icon: DollarSign },
  { label: 'Settings', href: '/settings', icon: Settings },
] as const;

// Nav links shared between mobile drawer and desktop sidebar.
// `forMobile` disables the collapsed icon-only mode in the drawer.
// Module-scoped (deps passed as props) so it isn't recreated each render.
function NavLinks({
  forMobile = false,
  pathname,
  collapsed,
  onNavigate,
}: {
  forMobile?: boolean;
  pathname: string;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  return (
    <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
      {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        const iconOnly = !forMobile && collapsed;
        return (
          <Link
            key={href}
            href={href}
            onClick={forMobile ? onNavigate : undefined}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              active
                ? 'bg-sidebar-accent text-[#D4A017]'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground',
              iconOnly && 'justify-center px-2'
            )}
            title={iconOnly ? label : undefined}
          >
            <Icon className={cn('shrink-0 size-4', active && 'text-[#D4A017]')} />
            {!iconOnly && <span>{label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

// Bottom user block shared between mobile and desktop (module-scoped, deps via props).
function UserBlock({
  forMobile = false,
  collapsed,
  userName,
  userEmail,
  roleName,
  onSignOut,
}: {
  forMobile?: boolean;
  collapsed: boolean;
  userName: string;
  userEmail: string;
  roleName: string;
  onSignOut: () => void;
}) {
  const iconOnly = !forMobile && collapsed;
  return (
    <div className="px-3 py-4 border-t border-sidebar-border">
      {!iconOnly && (
        <div className="mb-3 px-1">
          <p className="text-sm font-medium text-foreground truncate">{userName}</p>
          <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
          <p className="text-xs text-[#D4A017] mt-0.5 capitalize">{roleName}</p>
        </div>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={onSignOut}
        className={cn(
          'w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10',
          iconOnly ? 'justify-center px-2' : 'justify-start gap-2'
        )}
        title={iconOnly ? 'Sign out' : undefined}
      >
        <LogOut className="size-4 shrink-0" />
        {!iconOnly && <span>Sign out</span>}
      </Button>
    </div>
  );
}

export function Sidebar({ userName, userEmail, roleName }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/sign-in';
  };

  // Close mobile drawer on route change
  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {/* ── Mobile: hamburger trigger (fixed, top-left) ── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 flex items-center justify-center w-9 h-9 rounded-md bg-sidebar border border-sidebar-border text-sidebar-foreground shadow-sm"
        aria-label="Open navigation"
        aria-expanded={mobileOpen}
      >
        <Menu className="size-5" />
      </button>

      {/* ── Mobile: backdrop ── */}
      <div
        aria-hidden="true"
        className={cn(
          'md:hidden fixed inset-0 z-40 bg-black/60 transition-opacity duration-200',
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={closeMobile}
      />

      {/* ── Mobile: slide-in drawer ── */}
      <aside
        className={cn(
          'md:hidden fixed top-0 left-0 z-50 flex flex-col h-full w-64',
          'bg-sidebar border-r border-sidebar-border',
          'transition-transform duration-200 ease-in-out will-change-transform',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Navigation"
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-sidebar-border">
          <span className="text-xl font-black tracking-widest text-[#D4A017]">VIBE</span>
          <button
            onClick={closeMobile}
            className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            aria-label="Close navigation"
          >
            <X className="size-5" />
          </button>
        </div>

        <NavLinks forMobile pathname={pathname} collapsed={collapsed} onNavigate={closeMobile} />

        <div className="px-2 pb-2">
          <NotificationBell collapsed={false} />
        </div>

        <UserBlock
          forMobile
          collapsed={collapsed}
          userName={userName}
          userEmail={userEmail}
          roleName={roleName}
          onSignOut={handleSignOut}
        />
      </aside>

      {/* ── Desktop: persistent sidebar ── */}
      <aside
        className={cn(
          'hidden md:flex flex-col h-full bg-sidebar border-r border-sidebar-border',
          'transition-all duration-200',
          collapsed ? 'w-16' : 'w-56'
        )}
        aria-label="Navigation"
      >
        {/* Desktop header */}
        <div className="flex items-center justify-between px-4 py-5 border-b border-sidebar-border">
          {!collapsed && (
            <span className="text-xl font-black tracking-widest text-[#D4A017]">VIBE</span>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={cn(
              'flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors',
              collapsed && 'mx-auto'
            )}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
          </button>
        </div>

        <NavLinks pathname={pathname} collapsed={collapsed} onNavigate={closeMobile} />

        <div className="px-2 pb-2">
          <NotificationBell collapsed={collapsed} />
        </div>

        <UserBlock
          collapsed={collapsed}
          userName={userName}
          userEmail={userEmail}
          roleName={roleName}
          onSignOut={handleSignOut}
        />
      </aside>
    </>
  );
}
