import type { NextConfig } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
const extraConnectSrc = appUrl ? ` ${appUrl}` : '';

// Common IDX vendor hosts for the Phase 5 sites product (embed blocks on
// /p/ public pages load third-party widget scripts + XHR). Add more as
// tenants onboard new vendors.
const idxVendorHosts = [
  'https://*.ihomefinder.com',
  'https://*.idxbroker.com',
  'https://*.showcaseidx.com',
  'https://*.realtyna.com',
  'https://*.realtyjuggler.com',
].join(' ');

// Production-grade security headers
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${idxVendorHosts}`,
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: https: blob:`,
      "font-src 'self' data:",
      // Twilio Voice SDK (WebRTC) signalling lives on eventgw.twilio.com + wss.
      `connect-src 'self' https://*.stripe.com https://*.vercel.app https://api.anthropic.com https://eventgw.twilio.com wss://*.twilio.com ${idxVendorHosts}${extraConnectSrc}`,
      `frame-src https://*.stripe.com ${idxVendorHosts}`,
      // Clickjacking guard — supersedes X-Frame-Options on modern browsers and
      // applies even where iframe embedding would otherwise be allowed by CSP.
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "worker-src 'self' blob:",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  // Coolify Docker build: produce a minimal Node server bundle in .next/standalone.
  // Vercel ignores this flag, so leaving it on does not affect the existing
  // Vercel deployment that stays up as fallback.
  output: 'standalone',
  // Externalize packages that have native bindings or need Node.js runtime
  serverExternalPackages: ['pg', '@prisma/adapter-pg', 'better-auth'],
  // Use turbopack for faster builds in development
  turbopack: {
    root: __dirname,
  },
  // Security headers applied to all routes
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  // Permanent redirects for marketing shortlinks
  async redirects() {
    return [
      // Ads and docs sometimes link to /demo — we are pre-launch, the current
      // high-intent surface is the Founding 50 waitlist.
      { source: '/demo', destination: '/founding-50', permanent: true },
    ];
  },
  // Optional: Image optimization (if using next/image)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.stripe.com',
      },
      {
        protocol: 'https',
        hostname: '**.vercel.app',
      },
    ],
  },
};

export default nextConfig;
