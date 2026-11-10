export default function FormDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-md bg-zinc-800" />
        <div className="h-6 w-48 rounded-md bg-zinc-800" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="h-5 w-32 rounded bg-zinc-800" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 w-full rounded-md bg-zinc-800" />
          ))}
        </div>
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="h-5 w-40 rounded bg-zinc-800" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 w-full rounded-md bg-zinc-800" />
          ))}
        </div>
      </div>
    </div>
  );
}
