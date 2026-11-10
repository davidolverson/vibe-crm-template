export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div className="h-8 w-48 animate-pulse rounded bg-zinc-800" />
      <div className="inline-flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900/40 p-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-7 w-24 animate-pulse rounded bg-zinc-800" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="h-3 w-32 animate-pulse rounded bg-zinc-800" />
            <div className="mt-4 h-7 w-24 animate-pulse rounded bg-zinc-800" />
          </div>
        ))}
      </div>
    </div>
  );
}
