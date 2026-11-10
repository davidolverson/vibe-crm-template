export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="h-8 w-56 animate-pulse rounded bg-zinc-800" />
      <div className="h-4 w-96 animate-pulse rounded bg-zinc-900" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="h-5 w-64 animate-pulse rounded bg-zinc-800" />
          <div className="mt-2 h-3 w-full max-w-md animate-pulse rounded bg-zinc-900" />
          <div className="mt-4 flex gap-3">
            <div className="h-10 w-40 animate-pulse rounded bg-zinc-800" />
            <div className="h-10 w-32 animate-pulse rounded bg-zinc-800" />
          </div>
        </div>
      ))}
    </div>
  );
}
