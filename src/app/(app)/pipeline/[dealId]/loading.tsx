export default function DealDetailLoading() {
  return (
    <div className="space-y-6 max-w-3xl animate-pulse">
      {/* Back nav skeleton */}
      <div className="h-8 w-32 rounded-md bg-zinc-800" />

      {/* Deal info card skeleton */}
      <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
        {/* Header */}
        <div className="p-6 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1">
              <div className="h-6 w-2/3 rounded bg-zinc-700" />
              <div className="flex gap-2">
                <div className="h-5 w-16 rounded-full bg-zinc-700" />
                <div className="h-5 w-24 rounded-full bg-zinc-700" />
              </div>
            </div>
            <div className="h-8 w-20 rounded-md bg-zinc-700 shrink-0" />
          </div>
        </div>

        {/* Separator */}
        <div className="h-px bg-zinc-700" />

        {/* Info grid skeleton */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-20 rounded bg-zinc-800" />
              <div className="h-4 w-32 rounded bg-zinc-700" />
            </div>
          ))}
        </div>

        {/* Contact link skeleton */}
        <div className="px-6 pb-4">
          <div className="h-4 w-40 rounded bg-zinc-800" />
        </div>

        {/* Separator */}
        <div className="h-px bg-zinc-700" />

        {/* Action buttons skeleton */}
        <div className="px-6 py-4 flex gap-3">
          <div className="h-9 w-28 rounded-md bg-zinc-700" />
          <div className="h-9 w-28 rounded-md bg-zinc-700" />
        </div>
      </div>

      {/* Activity timeline skeleton */}
      <div className="rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
        <div className="p-6 border-b border-zinc-700">
          <div className="h-5 w-40 rounded bg-zinc-700" />
        </div>
        <div className="p-6 space-y-0">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3 pb-4">
              <div className="flex flex-col items-center">
                <div className="mt-1 size-7 shrink-0 rounded-full bg-zinc-800" />
                {i < 3 && <div className="w-px flex-1 bg-zinc-700 my-1 min-h-[1rem]" />}
              </div>
              <div className="min-w-0 flex-1 space-y-1.5 pt-1">
                <div className="flex items-baseline gap-2">
                  <div className="h-4 w-28 rounded bg-zinc-700" />
                  <div className="h-3 w-16 rounded bg-zinc-800" />
                </div>
                <div className="h-3 w-48 rounded bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
