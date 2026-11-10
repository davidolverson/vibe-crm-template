export default function SignInLoading() {
  return (
    <div className="w-full max-w-sm mx-auto animate-pulse space-y-8">
      <div className="space-y-2">
        <div className="h-7 w-40 rounded bg-zinc-800/80" />
        <div className="h-4 w-56 rounded bg-zinc-900" />
      </div>
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="h-3 w-12 rounded bg-zinc-900" />
          <div className="h-11 w-full rounded-md bg-zinc-900" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-16 rounded bg-zinc-900" />
          <div className="h-11 w-full rounded-md bg-zinc-900" />
        </div>
        <div className="h-11 w-full rounded-md bg-cyan-500/20" />
      </div>
    </div>
  );
}
