const COLUMN_WIDTHS = ['w-28', 'w-24', 'w-32', 'w-20'];
const CARD_COUNTS = [3, 4, 2, 3];

export default function PipelineLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-24 rounded-md bg-zinc-800" />
          <div className="h-4 w-48 rounded-md bg-zinc-800" />
        </div>
        <div className="h-9 w-28 rounded-md bg-zinc-800" />
      </div>

      {/* 4-column kanban board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {CARD_COUNTS.map((cardCount, colIndex) => (
          <div
            key={colIndex}
            className="rounded-xl border border-border bg-card flex flex-col"
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className={`h-4 ${COLUMN_WIDTHS[colIndex]} rounded bg-zinc-800`} />
              <div className="h-5 w-6 rounded-full bg-zinc-800" />
            </div>

            {/* Deal cards */}
            <div className="p-3 space-y-2.5">
              {Array.from({ length: cardCount }).map((_, cardIndex) => (
                <div
                  key={cardIndex}
                  className="rounded-lg border border-border bg-background p-3 space-y-2"
                >
                  <div className="h-4 w-3/4 rounded bg-zinc-800" />
                  <div className="h-3 w-1/2 rounded bg-zinc-800" />
                  <div className="flex items-center justify-between pt-1">
                    <div className="h-5 w-16 rounded-full bg-zinc-800" />
                    <div className="h-3 w-14 rounded bg-zinc-800" />
                  </div>
                </div>
              ))}

              {/* Add deal button skeleton */}
              <div className="h-8 w-full rounded-md bg-zinc-800/50 mt-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
