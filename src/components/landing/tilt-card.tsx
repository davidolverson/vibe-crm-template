'use client';

import { useRef, useEffect, type ReactNode } from 'react';

type TiltCardProps = {
  children: ReactNode;
  className?: string;
  /** Maximum rotation in degrees. Lower = subtler. */
  max?: number;
};

/**
 * Subtle mouse-tilt. Card rotates in 3D space tracking the cursor's relative
 * position within the card. Respects prefers-reduced-motion.
 */
export function TiltCard({ children, className = '', max = 5 }: TiltCardProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    function handleMove(e: MouseEvent) {
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      const rx = (-dy * max).toFixed(2);
      const ry = (dx * max).toFixed(2);
      node.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
    }
    function handleLeave() {
      if (!node) return;
      node.style.transform =
        'perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0)';
    }

    node.addEventListener('mousemove', handleMove);
    node.addEventListener('mouseleave', handleLeave);
    return () => {
      node.removeEventListener('mousemove', handleMove);
      node.removeEventListener('mouseleave', handleLeave);
    };
  }, [max]);

  return (
    <div
      ref={ref}
      className={`transition-transform duration-200 ease-out will-change-transform ${className}`}
      style={{ transformStyle: 'preserve-3d' }}
    >
      {children}
    </div>
  );
}
