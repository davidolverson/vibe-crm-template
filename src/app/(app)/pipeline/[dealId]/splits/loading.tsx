export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="h-4 w-32 animate-pulse rounded bg-zinc-900" />
      <div className="h-8 w-64 animate-pulse rounded bg-zinc-800" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="h-3 w-16 animate-pulse rounded bg-zinc-800" />
            <div className="mt-3 h-6 w-20 animate-pulse rounded bg-zinc-800" />
          </div>
        ))}
      </div>
      <div className="h-40 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/40" />
    </div>
  );
}
