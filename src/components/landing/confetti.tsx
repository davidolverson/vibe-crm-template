'use client';

import { useEffect, useRef } from 'react';

type ConfettiProps = {
  /** Start the burst automatically on mount. Default true. */
  autoStart?: boolean;
  /** Palette for the particles. */
  colors?: string[];
  /** How many particles to emit. */
  count?: number;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  size: number;
  color: string;
  life: number;
};

const GOLD_PALETTE = ['#D4A017', '#E8BC3A', '#F5F1EA', '#8C6A0F'];

/**
 * Lightweight canvas confetti burst for the founding-spot success state.
 * No external dependency. Respects prefers-reduced-motion by not running.
 */
export function Confetti({
  autoStart = true,
  colors = GOLD_PALETTE,
  count = 120,
}: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!autoStart) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const w = parent.clientWidth;
    const h = parent.clientHeight;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const particles: Particle[] = Array.from({ length: count }).map(() => ({
      x: w / 2,
      y: h / 2,
      vx: (Math.random() - 0.5) * 16,
      vy: (Math.random() - 0.5) * 16 - 2,
      rot: Math.random() * Math.PI,
      vrot: (Math.random() - 0.5) * 0.3,
      size: 4 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)]!,
      life: 1,
    }));

    let raf = 0;
    const start = performance.now();
    const duration = 1800;

    function tick(now: number) {
      if (!ctx || !canvas) return;
      const t = now - start;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.vy += 0.35; // gravity
        p.vx *= 0.995; // drag
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vrot;
        p.life = Math.max(0, 1 - t / duration);

        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5);
        ctx.restore();
      }

      if (t < duration) {
        raf = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [autoStart, colors, count]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="absolute inset-0 pointer-events-none"
    />
  );
}
