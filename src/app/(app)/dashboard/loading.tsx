export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Page header */}
      <div className="space-y-2">
        <div className="h-7 w-36 rounded-md bg-zinc-800" />
        <div className="h-4 w-52 rounded-md bg-zinc-800" />
      </div>

      {/* 4 stat card skeletons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-28 rounded bg-zinc-800" />
              <div className="h-4 w-4 rounded bg-zinc-800" />
            </div>
            <div className="h-8 w-20 rounded bg-zinc-800" />
          </div>
        ))}
      </div>

      {/* Recent activity card skeleton */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        {/* Card header */}
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-zinc-800" />
          <div className="h-5 w-32 rounded bg-zinc-800" />
        </div>

        {/* Activity rows */}
        <ul className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <li
              key={i}
              className="flex items-start justify-between gap-4 py-2 border-b border-border last:border-0"
            >
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-3/4 rounded bg-zinc-800" />
                <div className="h-3 w-1/2 rounded bg-zinc-800" />
              </div>
              <div className="h-3 w-12 rounded bg-zinc-800 shrink-0 mt-0.5" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
