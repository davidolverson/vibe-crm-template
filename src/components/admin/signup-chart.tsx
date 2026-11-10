type DailyPoint = { date: string; count: number };

type Props = {
  daily: Array<DailyPoint>;
  /** SVG aspect -- defaults tuned for panel card width. */
  width?: number;
  height?: number;
};

/**
 * Minimal inline sparkline. Pure SVG, no chart libs.
 * Stroke is gold #D4A017, no fill, no glow.
 */
export function SignupChart({ daily, width = 320, height = 72 }: Props) {
  if (!daily || daily.length === 0) {
    return (
      <div className="flex h-[72px] items-center justify-center font-mono text-[10px] uppercase tracking-[0.24em] text-[#52525B]">
        No data
      </div>
    );
  }

  const counts = daily.map((d) => d.count);
  const max = Math.max(...counts, 1);
  const min = Math.min(...counts, 0);
  const range = max - min || 1;

  const padX = 4;
  const padY = 6;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const stepX = daily.length > 1 ? innerW / (daily.length - 1) : 0;

  const points = daily
    .map((d, i) => {
      const x = padX + i * stepX;
      const y = padY + innerH - ((d.count - min) / range) * innerH;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  const first = daily[0];
  const last = daily[daily.length - 1];

  return (
    <div className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-[72px] w-full"
        role="img"
        aria-label={`Signup trend from ${first.date} to ${last.date}`}
      >
        <polyline
          points={points}
          fill="none"
          stroke="#D4A017"
          strokeWidth={1.25}
          strokeLinecap="square"
          strokeLinejoin="miter"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-[#52525B]">
        <span>{first.date}</span>
        <span className="text-[#71717A]">Peak {max}</span>
        <span>{last.date}</span>
      </div>
    </div>
  );
}
