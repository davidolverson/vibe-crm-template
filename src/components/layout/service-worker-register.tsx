'use client';

import { useEffect } from 'react';

/**
 * Registers /sw.js in production browsers that support service workers.
 * In dev we unregister any existing SW so stale assets don't mask
 * hot-reload changes.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV !== 'production') {
      // Unregister leftovers so dev doesn't fight Turbopack.
      navigator.serviceWorker.getRegistrations?.().then((regs) => {
        regs.forEach((r) => r.unregister().catch(() => {}));
      });
      return;
    }

    const controller = new AbortController();
    window.addEventListener(
      'load',
      () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.warn('[sw] registration failed', err);
        });
      },
      { once: true, signal: controller.signal }
    );

    return () => controller.abort();
  }, []);

  return null;
}
