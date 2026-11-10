import { Bell } from 'lucide-react';
import { getNotifications, markAllAsRead } from './actions';

export const metadata = { title: 'Notifications | VIBE' };
export const dynamic = 'force-dynamic';

function fmtRelative(d: Date): string {
  const delta = Date.now() - d.getTime();
  const mins = Math.floor(delta / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

export default async function NotificationsPage() {
  const { notifications, unreadCount } = await getNotifications();

  async function markAll() {
    'use server';
    await markAllAsRead();
  }

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {unreadCount > 0
              ? `${unreadCount} unread`
              : notifications.length > 0
                ? 'All caught up.'
                : 'Nothing here yet.'}
          </p>
        </div>
        {unreadCount > 0 ? (
          <form action={markAll}>
            <button
              type="submit"
              className="rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-200 hover:border-zinc-700"
            >
              Mark all read
            </button>
          </form>
        ) : null}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center">
          <Bell className="mx-auto h-8 w-8 text-zinc-600" />
          <p className="mt-4 text-sm text-zinc-400">
            You don&apos;t have any notifications yet. Lead alerts, task reminders, and financial
            alerts will show up here as they fire.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-zinc-800/60 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40">
          {notifications.map((n) => (
            <li
              key={n.id}
              className={`px-5 py-4 ${
                !n.readAt ? 'bg-[#D4A017]/5 border-l-2 border-[#D4A017]' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">{n.title}</p>
                  {n.body ? (
                    <p className="mt-1 text-sm text-zinc-400">{n.body}</p>
                  ) : null}
                </div>
                <time className="shrink-0 text-xs text-zinc-500">
                  {fmtRelative(n.createdAt)}
                </time>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
