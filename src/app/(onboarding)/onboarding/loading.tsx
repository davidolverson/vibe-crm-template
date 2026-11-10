export default function OnboardingLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-3">
        <div className="h-[10px] w-28 rounded bg-[#C9BFA8]/40" />
        <div className="h-8 w-48 rounded bg-[#1A1512]/10" />
        <div className="h-4 w-64 rounded bg-[#1A1512]/10" />
      </div>
      <div className="space-y-2">
        <div className="h-[10px] w-32 rounded bg-[#C9BFA8]/40" />
        <div className="h-10 w-full rounded-[2px] bg-[#1A1512]/10" />
        <div className="h-3 w-56 rounded bg-[#1A1512]/10" />
      </div>
      <div className="h-11 w-full rounded-[2px] bg-[#1A1512]" />
    </div>
  );
}
