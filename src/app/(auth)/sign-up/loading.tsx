export default function SignUpLoading() {
  return (
    <div className="w-full max-w-md mx-auto animate-pulse">
      <div className="rounded-xl border border-zinc-800 bg-[#1A1A2E] p-6 space-y-4">
        <div className="h-6 w-36 rounded bg-zinc-800" />
        <div className="h-4 w-52 rounded bg-zinc-800" />
        <div className="space-y-3">
          <div className="h-10 w-full rounded-md bg-zinc-800" />
          <div className="h-10 w-full rounded-md bg-zinc-800" />
          <div className="h-10 w-full rounded-md bg-zinc-800" />
          <div className="h-10 w-full rounded-md bg-zinc-800" />
        </div>
      </div>
    </div>
  );
}
