function SkelLine({
  width = '60%',
  height = 12,
}: {
  width?: string;
  height?: number;
}) {
  return (
    <span
      aria-hidden
      className="block animate-pulse rounded-[2px] bg-[#27272A]"
      style={{ width, height }}
    />
  );
}

function SkelPanel() {
  return (
    <section className="rounded-[2px] border border-[#27272A] bg-[#18181B] p-6">
      <div className="mb-6 flex items-baseline justify-between">
        <SkelLine width="96px" height={10} />
        <SkelLine width="48px" height={10} />
      </div>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <SkelLine width="64px" height={10} />
          <SkelLine width="140px" height={36} />
          <SkelLine width="180px" height={10} />
        </div>
        <div className="flex flex-col gap-2">
          <SkelLine width="100%" height={56} />
          <SkelLine width="100%" height={10} />
        </div>
      </div>
    </section>
  );
}

export default function AdminDashboardLoading() {
  return (
    <div className="min-h-screen bg-[#09090B] text-[#FAFAFA]">
      <div className="mx-auto w-full max-w-[1400px] px-6 pb-16 pt-10 sm:px-10">
        <header className="mb-10 flex flex-col gap-3 border-b border-[#27272A] pb-8">
          <span className="font-mono text-[10px] uppercase tracking-[0.34em] text-[#D4A017]">
            VIBE · PLATFORM
          </span>
          <h1 className="font-display text-[48px] font-semibold leading-[1.05] tracking-tight text-[#FAFAFA] sm:text-[56px]">
            Control room.
          </h1>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#71717A]">
            Loading…
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <SkelPanel />
          <SkelPanel />
          <SkelPanel />
          <SkelPanel />
        </div>

        <section className="mt-6 rounded-[2px] border border-[#27272A] bg-[#18181B]">
          <div className="flex items-baseline justify-between border-b border-[#27272A] px-6 py-4">
            <SkelLine width="120px" height={10} />
            <SkelLine width="48px" height={10} />
          </div>
          <div className="flex flex-col gap-3 px-6 py-5">
            <SkelLine width="100%" height={14} />
            <SkelLine width="92%" height={14} />
            <SkelLine width="86%" height={14} />
            <SkelLine width="78%" height={14} />
          </div>
        </section>
      </div>
    </div>
  );
}
