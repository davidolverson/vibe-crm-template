export default function ContactDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Back link skeleton */}
      <div className="h-4 w-28 rounded bg-zinc-800" />

      {/* Contact header card */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          {/* Avatar */}
          <div className="h-16 w-16 rounded-full bg-zinc-800 shrink-0" />

          {/* Name / meta */}
          <div className="flex-1 space-y-2.5">
            <div className="h-7 w-48 rounded-md bg-zinc-800" />
            <div className="h-4 w-36 rounded bg-zinc-800" />
            <div className="flex flex-wrap gap-2 pt-1">
              <div className="h-5 w-20 rounded-full bg-zinc-800" />
              <div className="h-5 w-24 rounded-full bg-zinc-800" />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <div className="h-9 w-20 rounded-md bg-zinc-800" />
            <div className="h-9 w-9 rounded-md bg-zinc-800" />
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: contact info */}
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="h-5 w-32 rounded bg-zinc-800" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="h-3 w-16 rounded bg-zinc-800" />
                <div className="h-4 w-40 rounded bg-zinc-800" />
              </div>
            ))}
          </div>
        </div>

        {/* Right: activity feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-5 w-28 rounded bg-zinc-800" />
              <div className="h-8 w-24 rounded-md bg-zinc-800" />
            </div>

            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex gap-3 py-3 border-b border-border last:border-0"
              >
                <div className="h-7 w-7 rounded-full bg-zinc-800 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 w-3/4 rounded bg-zinc-800" />
                  <div className="h-3 w-1/2 rounded bg-zinc-800" />
                  <div className="h-3 w-20 rounded bg-zinc-800" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
