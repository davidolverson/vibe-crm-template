'use client';

import { useEffect, useRef, useState } from 'react';

type RevealProps = {
  children: React.ReactNode;
  delayMs?: number;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
};

/**
 * Scroll-reveal wrapper. Fades + rises children the first time they intersect.
 * Intentionally tiny -- no animation library. Respects prefers-reduced-motion
 * by immediately marking visible.
 */
export function Reveal({
  children,
  delayMs = 0,
  as: Tag = 'div',
  className = '',
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      // Reduced-motion: reveal immediately. matchMedia is client-only so this
      // one-shot set can't happen during render; it runs once and returns.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            window.setTimeout(() => setVisible(true), delayMs);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -10% 0px' },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [delayMs]);

  const TagAny = Tag as unknown as 'div';
  return (
    <TagAny
      ref={ref as React.RefObject<HTMLDivElement>}
      data-visible={visible ? 'true' : 'false'}
      className={`transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      } ${className}`}
    >
      {children}
    </TagAny>
  );
}
