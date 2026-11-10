import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

export const alt = 'VIBE -- Vertical Integration Business Enterprise';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background:
            'radial-gradient(ellipse 900px 500px at 50% 40%, rgba(212,160,23,0.14), rgba(10,10,15,0) 70%), #0A0A0F',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif',
          padding: '80px',
          position: 'relative',
        }}
      >
        {/* Gold grid, masked to center */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(to right, rgba(212,160,23,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(212,160,23,0.12) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
            maskImage:
              'radial-gradient(ellipse 60% 55% at 50% 50%, black 30%, transparent 85%)',
          }}
        />

        {/* Eyebrow */}
        <div
          style={{
            fontSize: 22,
            letterSpacing: '0.32em',
            color: 'rgba(212,160,23,0.85)',
            textTransform: 'uppercase',
            fontWeight: 500,
            marginBottom: 48,
            display: 'flex',
          }}
        >
          The future of real estate is here
        </div>

        {/* Wordmark */}
        <div
          style={{
            fontSize: 200,
            letterSpacing: '0.08em',
            color: '#D4A017',
            fontWeight: 400,
            lineHeight: 1,
            display: 'flex',
            fontFamily: 'serif',
          }}
        >
          VIBE
        </div>

        {/* Acronym subtitle */}
        <div
          style={{
            fontSize: 22,
            letterSpacing: '0.32em',
            color: '#71717A',
            textTransform: 'uppercase',
            marginTop: 20,
            marginBottom: 48,
            display: 'flex',
          }}
        >
          Vertical Integration Business Enterprise
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 52,
            color: '#FAFAFA',
            lineHeight: 1.1,
            textAlign: 'center',
            maxWidth: 960,
            display: 'flex',
            fontFamily: 'serif',
            letterSpacing: '-0.01em',
          }}
        >
          One CRM for your entire real estate empire.
        </div>

        {/* Footer bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 48,
            left: 80,
            right: 80,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 18,
            color: '#52525B',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          }}
        >
          <div style={{ display: 'flex' }}>example.com</div>
          <div style={{ display: 'flex', color: '#D4A017' }}>Founding 50 · Open</div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
