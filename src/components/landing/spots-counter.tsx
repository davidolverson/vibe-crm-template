'use client';

import { useEffect, useRef, useState } from 'react';

type SpotsCounterProps = {
  remaining: number;
  className?: string;
};

/**
 * Animates the "X of 10 founding spots remaining" number like a slot machine.
 * Starts at 10 (all open), rapid-ticks through, settles on the real `remaining`
 * once the element scrolls into view. Respects prefers-reduced-motion.
 */
export function SpotsCounter({ remaining, className = '' }: SpotsCounterProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [value, setValue] = useState(remaining);
  const startedRef = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !startedRef.current) {
            startedRef.current = true;
            runSlot();
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.6 },
    );
    io.observe(node);

    function runSlot() {
      // Tick through a random range a few times, then settle on `remaining`.
      const ceil = Math.max(10, remaining + 5);
      const frames: number[] = [];
      for (let i = 0; i < 14; i++) frames.push(Math.floor(Math.random() * ceil));
      frames.push(remaining);
      let i = 0;
      const step = () => {
        setValue(frames[i]!);
        i += 1;
        if (i < frames.length) {
          window.setTimeout(step, 55 + i * 7);
        }
      };
      step();
    }

    return () => io.disconnect();
  }, [remaining]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {value}
    </span>
  );
}
