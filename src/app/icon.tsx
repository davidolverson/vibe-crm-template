import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0A0A0F',
          color: '#D4A017',
          fontSize: 22,
          fontFamily: 'serif',
          fontWeight: 700,
          letterSpacing: '-0.02em',
        }}
      >
        V
      </div>
    ),
    size,
  );
}
