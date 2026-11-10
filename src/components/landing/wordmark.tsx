import type { HTMLAttributes } from 'react';

type WordmarkProps = HTMLAttributes<HTMLDivElement> & {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showAcronym?: boolean;
  tone?: 'dark' | 'light';
};

const sizeMap = {
  sm: 'text-2xl',
  md: 'text-4xl',
  lg: 'text-6xl sm:text-7xl',
  xl: 'text-7xl sm:text-8xl md:text-9xl',
} as const;

export function Wordmark({
  size = 'md',
  showAcronym = false,
  tone = 'dark',
  className = '',
  ...rest
}: WordmarkProps) {
  const acronymColor = tone === 'dark' ? 'text-zinc-500' : 'text-zinc-400';
  return (
    <div
      className={`inline-flex flex-col items-center ${className}`}
      aria-label="VIBE -- Vertical Integration Business Enterprise"
      {...rest}
    >
      <span className={`vibe-wordmark ${sizeMap[size]} leading-none`}>
        VIBE
      </span>
      {showAcronym ? (
        <span
          className={`mt-2 font-mono text-[10px] tracking-[0.32em] uppercase ${acronymColor}`}
        >
          Vertical Integration Business Enterprise
        </span>
      ) : null}
    </div>
  );
}
