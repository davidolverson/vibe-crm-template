'use client';

import { useEffect, useRef } from 'react';

interface Props {
  siteId: string;
  pagePath: string;
}

/**
 * Fire-and-forget page-view tracker for public site pages.
 * - Generates/reuses a visitor anon id in localStorage
 * - Captures UTM params from the URL
 * - POSTs once per mount to /api/sites/track
 */
export function SiteTracker({ siteId, pagePath }: Props) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;

    try {
      let anonId = '';
      try {
        anonId = localStorage.getItem('vibe_anon_id') ?? '';
        if (!anonId) {
          anonId = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
          localStorage.setItem('vibe_anon_id', anonId);
        }
      } catch {
        anonId = 'no-storage';
      }

      const url = new URL(window.location.href);
      const utm = {
        source: url.searchParams.get('utm_source'),
        medium: url.searchParams.get('utm_medium'),
        campaign: url.searchParams.get('utm_campaign'),
        term: url.searchParams.get('utm_term'),
        content: url.searchParams.get('utm_content'),
      };
      const referrer = document.referrer || null;

      const body = JSON.stringify({
        siteId,
        pagePath,
        anonId,
        utm,
        referrer,
        ts: Date.now(),
      });

      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          '/api/sites/track',
          new Blob([body], { type: 'application/json' })
        );
      } else {
        void fetch('/api/sites/track', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // tracking failures must never break the render
    }
  }, [siteId, pagePath]);

  return null;
}
