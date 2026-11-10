const TAB_LABELS = ['w-16', 'w-20', 'w-24', 'w-14'];

export default function TasksLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-20 rounded-md bg-zinc-800" />
          <div className="h-4 w-40 rounded-md bg-zinc-800" />
        </div>
        <div className="h-9 w-24 rounded-md bg-zinc-800" />
      </div>

      {/* Tab bar skeleton */}
      <div className="flex gap-1 border-b border-border pb-0">
        {TAB_LABELS.map((w, i) => (
          <div
            key={i}
            className={`h-9 ${w} rounded-t-md bg-zinc-800 ${i === 0 ? 'opacity-100' : 'opacity-50'}`}
          />
        ))}
      </div>

      {/* Filter / search row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="h-9 flex-1 rounded-md bg-zinc-800" />
        <div className="h-9 w-32 rounded-md bg-zinc-800" />
      </div>

      {/* Task list skeleton */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3.5 border-b border-border last:border-0"
          >
            {/* Checkbox */}
            <div className="h-4 w-4 rounded bg-zinc-800 shrink-0" />

            {/* Task title + meta */}
            <div className="flex-1 space-y-1.5 min-w-0">
              <div className="h-4 w-3/4 rounded bg-zinc-800" />
              <div className="flex gap-3">
                <div className="h-3 w-20 rounded bg-zinc-800" />
                <div className="h-3 w-24 rounded bg-zinc-800" />
              </div>
            </div>

            {/* Priority badge */}
            <div className="h-5 w-16 rounded-full bg-zinc-800 shrink-0" />

            {/* Due date */}
            <div className="h-4 w-20 rounded bg-zinc-800 shrink-0 hidden sm:block" />

            {/* Action menu */}
            <div className="h-6 w-6 rounded bg-zinc-800 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
