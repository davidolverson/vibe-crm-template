export default function PricingLoading() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] animate-pulse">
      <div className="border-b border-zinc-800/60 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="h-6 w-24 rounded bg-zinc-800" />
          <div className="flex gap-3">
            <div className="h-9 w-20 rounded-lg bg-zinc-800" />
            <div className="h-9 w-24 rounded-lg bg-zinc-800" />
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 pt-16 pb-12 text-center space-y-4">
        <div className="h-10 w-80 mx-auto rounded-md bg-zinc-800" />
        <div className="h-4 w-96 mx-auto rounded-md bg-zinc-800" />
      </div>
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
              <div className="h-5 w-20 rounded bg-zinc-800" />
              <div className="h-8 w-16 rounded bg-zinc-800" />
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="h-4 w-full rounded bg-zinc-800" />
              ))}
              <div className="h-10 w-full rounded-lg bg-zinc-800" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
