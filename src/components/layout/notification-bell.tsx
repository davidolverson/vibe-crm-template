'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Bell, Check, CheckCheck, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  type NotificationItem,
} from '@/app/(app)/notifications/actions';

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------

function timeAgo(date: Date): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime(); // coerce -- serialised from server
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Icon map -- visual indicator per notification type
// ---------------------------------------------------------------------------

function NotificationDot({ read }: { read: boolean }) {
  if (read) return null;
  return (
    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[#D4A017]" aria-hidden="true" />
  );
}

// ---------------------------------------------------------------------------
// Single notification row
// ---------------------------------------------------------------------------

interface NotificationRowProps {
  item: NotificationItem;
  onMarkRead: (id: string) => void;
  isPending: boolean;
}

function NotificationRow({ item, onMarkRead, isPending }: NotificationRowProps) {
  const isRead = Boolean(item.readAt);
  const hasLink =
    item.referenceType === 'link' && item.referenceId;

  const content = (
    <div
      className={cn(
        'group flex items-start gap-3 px-4 py-3 transition-colors',
        !isRead && 'bg-white/[0.03]',
        hasLink && 'cursor-pointer hover:bg-white/[0.06]',
        !hasLink && !isRead && 'hover:bg-white/[0.05]'
      )}
      onClick={() => {
        if (!isRead) onMarkRead(item.id);
        if (hasLink && item.referenceId) {
          window.location.href = item.referenceId;
        }
      }}
      role={hasLink ? 'link' : undefined}
      tabIndex={hasLink ? 0 : undefined}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && hasLink && item.referenceId) {
          window.location.href = item.referenceId;
        }
      }}
    >
      <NotificationDot read={isRead} />
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-xs font-semibold leading-tight truncate',
            isRead ? 'text-muted-foreground' : 'text-foreground'
          )}
        >
          {item.title}
        </p>
        {item.body && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2 leading-snug">
            {item.body}
          </p>
        )}
        <p className="mt-1 text-[10px] text-muted-foreground/60">{timeAgo(item.createdAt)}</p>
      </div>
      {!isRead && !isPending && (
        <button
          className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            onMarkRead(item.id);
          }}
          title="Mark as read"
          aria-label="Mark as read"
        >
          <Check className="size-3.5" />
        </button>
      )}
    </div>
  );

  return content;
}

// ---------------------------------------------------------------------------
// Main bell component
// ---------------------------------------------------------------------------

interface NotificationBellProps {
  collapsed: boolean;
}

export function NotificationBell({ collapsed }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Load notifications when the dropdown opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // Show the spinner immediately when the dropdown opens, before the async
    // fetch resolves. Intentional one-shot on open, not a render-loop.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    getNotifications()
      .then((result) => {
        if (cancelled) return;
        setNotifications(result.notifications);
        setUnreadCount(result.unreadCount);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Initial unread count on mount (no full fetch)
  useEffect(() => {
    getNotifications()
      .then((result) => setUnreadCount(result.unreadCount))
      .catch(() => {});
  }, []);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [open]);

  const handleMarkRead = (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date() } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    startTransition(async () => {
      const result = await markAsRead(id);
      if (!result.success) {
        // Roll back optimistic update on failure
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, readAt: null } : n))
        );
        setUnreadCount((c) => c + 1);
      }
    });
  };

  const handleMarkAllRead = () => {
    const prevNotifications = notifications;
    const prevCount = unreadCount;

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date() })));
    setUnreadCount(0);

    startTransition(async () => {
      const result = await markAllAsRead();
      if (!result.success) {
        setNotifications(prevNotifications);
        setUnreadCount(prevCount);
      }
    });
  };

  const badgeCount = unreadCount > 99 ? '99+' : unreadCount;

  return (
    <div className="relative">
      {/* Bell trigger button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'relative flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors',
          collapsed ? 'w-9 h-9 mx-auto' : 'w-full gap-3 px-3 py-2 text-sm font-medium'
        )}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={collapsed ? 'Notifications' : undefined}
      >
        <Bell className="size-4 shrink-0" />
        {!collapsed && <span>Notifications</span>}
        {unreadCount > 0 && (
          <span
            className={cn(
              'absolute flex items-center justify-center rounded-full bg-red-500 text-white font-bold leading-none',
              collapsed
                ? 'top-0.5 right-0.5 min-w-[16px] h-4 text-[9px] px-0.5'
                : 'top-1.5 right-2 min-w-[18px] h-[18px] text-[10px] px-1'
            )}
            aria-hidden="true"
          >
            {badgeCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={dropdownRef}
          role="dialog"
          aria-label="Notifications"
          className={cn(
            'absolute z-50 w-80 rounded-xl border border-sidebar-border bg-sidebar shadow-2xl shadow-black/40',
            // Position: always opens to the right of the sidebar
            'left-full top-0 ml-2'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border">
            <h2 className="text-sm font-semibold text-foreground">Notifications</h2>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={isPending}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
                aria-label="Mark all notifications as read"
              >
                {isPending ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <CheckCheck className="size-3.5" />
                )}
                Mark all read
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <Bell className="size-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Activity on your deals, tasks, and forms will appear here.
                </p>
              </div>
            ) : (
              <ul role="list" className="divide-y divide-sidebar-border/60">
                {notifications.map((item) => (
                  <li key={item.id}>
                    <NotificationRow
                      item={item}
                      onMarkRead={handleMarkRead}
                      isPending={isPending}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-sidebar-border/60">
              <p className="text-[10px] text-muted-foreground/50 text-center">
                Showing last {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
