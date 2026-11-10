'use client';

import { useRef, useEffect, type ReactNode } from 'react';

type HoloCardProps = {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

/**
 * Holographic prismatic shimmer -- CSS custom properties track cursor x/y, a
 * radial rainbow gradient overlay follows the cursor. Respects
 * prefers-reduced-motion (overlay held static).
 */
export function HoloCard({
  children,
  className = '',
  style,
}: HoloCardProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    function handleMove(e: MouseEvent) {
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * 100;
      const py = ((e.clientY - rect.top) / rect.height) * 100;
      node.style.setProperty('--holo-x', `${px}%`);
      node.style.setProperty('--holo-y', `${py}%`);
      node.style.setProperty('--holo-opacity', '1');
    }
    function handleLeave() {
      node?.style.setProperty('--holo-opacity', '0');
    }
    node.addEventListener('mousemove', handleMove);
    node.addEventListener('mouseleave', handleLeave);
    return () => {
      node.removeEventListener('mousemove', handleMove);
      node.removeEventListener('mouseleave', handleLeave);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden ${className}`}
      style={
        {
          '--holo-x': '50%',
          '--holo-y': '50%',
          '--holo-opacity': '0',
          ...style,
        } as React.CSSProperties
      }
    >
      {children}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none mix-blend-soft-light transition-opacity duration-300"
        style={{
          opacity: 'var(--holo-opacity)',
          background:
            'radial-gradient(circle 320px at var(--holo-x) var(--holo-y), rgba(255, 220, 120, 0.55), rgba(180, 100, 255, 0.25) 35%, rgba(60, 200, 220, 0.18) 55%, transparent 75%)',
        }}
      />
    </div>
  );
}
