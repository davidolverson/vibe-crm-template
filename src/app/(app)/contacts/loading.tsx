export default function ContactsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-28 rounded-md bg-zinc-800" />
          <div className="h-4 w-44 rounded-md bg-zinc-800" />
        </div>
        {/* Add contact button skeleton */}
        <div className="h-9 w-32 rounded-md bg-zinc-800" />
      </div>

      {/* Search bar + filter row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="h-9 flex-1 rounded-md bg-zinc-800" />
        <div className="h-9 w-28 rounded-md bg-zinc-800" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-4 gap-4 px-4 py-3 border-b border-border">
          {['w-20', 'w-36', 'w-28', 'w-16'].map((w, i) => (
            <div key={i} className={`h-3.5 ${w} rounded bg-zinc-800`} />
          ))}
        </div>

        {/* Table rows - 6 rows */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-4 gap-4 px-4 py-4 border-b border-border last:border-0 items-center"
          >
            {/* Avatar + name */}
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-zinc-800 shrink-0" />
              <div className="h-4 w-24 rounded bg-zinc-800" />
            </div>
            {/* Email */}
            <div className="h-4 w-36 rounded bg-zinc-800" />
            {/* Phone / company */}
            <div className="h-4 w-28 rounded bg-zinc-800" />
            {/* Badge / status */}
            <div className="h-5 w-16 rounded-full bg-zinc-800" />
          </div>
        ))}
      </div>

      {/* Pagination skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-4 w-32 rounded bg-zinc-800" />
        <div className="flex gap-2">
          <div className="h-8 w-8 rounded-md bg-zinc-800" />
          <div className="h-8 w-8 rounded-md bg-zinc-800" />
          <div className="h-8 w-8 rounded-md bg-zinc-800" />
        </div>
      </div>
    </div>
  );
}
