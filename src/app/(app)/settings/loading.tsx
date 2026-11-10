const SETTINGS_SECTIONS = [
  { titleWidth: 'w-28', fields: 3 },
  { titleWidth: 'w-36', fields: 2 },
  { titleWidth: 'w-32', fields: 4 },
  { titleWidth: 'w-24', fields: 2 },
];

export default function SettingsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Page header */}
      <div className="space-y-2">
        <div className="h-7 w-24 rounded-md bg-zinc-800" />
        <div className="h-4 w-60 rounded-md bg-zinc-800" />
      </div>

      {/* Settings cards */}
      <div className="space-y-5">
        {SETTINGS_SECTIONS.map(({ titleWidth, fields }, sectionIndex) => (
          <div
            key={sectionIndex}
            className="rounded-xl border border-border bg-card p-6 space-y-5"
          >
            {/* Section title + description */}
            <div className="space-y-1.5 pb-2 border-b border-border">
              <div className={`h-5 ${titleWidth} rounded bg-zinc-800`} />
              <div className="h-3.5 w-64 rounded bg-zinc-800" />
            </div>

            {/* Fields */}
            {Array.from({ length: fields }).map((_, fieldIndex) => (
              <div key={fieldIndex} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                <div className="space-y-1">
                  <div className="h-3.5 w-24 rounded bg-zinc-800" />
                  <div className="h-3 w-40 rounded bg-zinc-800" />
                </div>
                <div className="sm:col-span-2">
                  <div className="h-9 w-full rounded-md bg-zinc-800" />
                </div>
              </div>
            ))}

            {/* Save button */}
            <div className="flex justify-end pt-2">
              <div className="h-9 w-28 rounded-md bg-zinc-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
