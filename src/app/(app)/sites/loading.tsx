export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div className="h-8 w-32 animate-pulse rounded bg-zinc-800" />
      <div className="h-4 w-96 animate-pulse rounded bg-zinc-900" />
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <div className="h-4 w-40 animate-pulse rounded bg-zinc-800" />
              <div className="h-4 w-24 animate-pulse rounded bg-zinc-800" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
