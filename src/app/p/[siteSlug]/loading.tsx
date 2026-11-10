export default function Loading() {
  return (
    <main className="min-h-screen bg-[#0A0A0F] text-white">
      <section className="flex min-h-[60vh] items-center justify-center px-6">
        <div className="w-full max-w-2xl space-y-4 text-center">
          <div className="mx-auto h-10 w-3/4 animate-pulse rounded bg-zinc-900" />
          <div className="mx-auto h-4 w-1/2 animate-pulse rounded bg-zinc-900" />
        </div>
      </section>
    </main>
  );
}
