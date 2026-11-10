import type { ReactNode } from 'react';

type Tone = 'success' | 'warning' | 'error';

type Props = {
  label: string;
  value: ReactNode;
  /** Optional subline (e.g. "+12 last 7d"). */
  sub?: ReactNode;
  /** Tints the numeric value. Default = neutral text. */
  tone?: Tone;
  /** Controls value size. "lg" = headline stat, "sm" = inline metric. */
  size?: 'lg' | 'sm';
};

const TONE_COLOR: Record<Tone, string> = {
  success: '#4ADE80',
  warning: '#FBBF24',
  error: '#F87171',
};

export function Stat({ label, value, sub, tone, size = 'lg' }: Props) {
  const color = tone ? TONE_COLOR[tone] : '#FAFAFA';
  const valueClass =
    size === 'lg'
      ? 'font-display text-[44px] leading-none font-semibold tracking-tight'
      : 'font-display text-[22px] leading-none font-medium tracking-tight';

  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#71717A]">
        {label}
      </span>
      <span className={valueClass} style={{ color }}>
        {value}
      </span>
      {sub ? (
        <span className="font-mono text-[11px] text-[#71717A]">{sub}</span>
      ) : null}
    </div>
  );
}
