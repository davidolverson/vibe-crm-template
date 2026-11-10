export default function BillingLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-24 rounded-md bg-zinc-800" />
        <div className="h-4 w-56 rounded-md bg-zinc-800" />
      </div>
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="h-5 w-32 rounded bg-zinc-800" />
        <div className="h-10 w-full rounded-md bg-zinc-800" />
        <div className="h-10 w-full rounded-md bg-zinc-800" />
      </div>
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="h-5 w-40 rounded bg-zinc-800" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 rounded-lg bg-zinc-800" />
          ))}
        </div>
      </div>
    </div>
  );
}
