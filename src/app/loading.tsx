export default function RootLoading() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
      <div className="animate-pulse text-center space-y-4">
        <div className="h-8 w-24 mx-auto rounded-md bg-zinc-800" />
        <div className="h-4 w-48 mx-auto rounded-md bg-zinc-800" />
      </div>
    </div>
  );
}
