import type { Metadata, Viewport } from 'next';
import { Fraunces, Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const display = Fraunces({
  variable: '--font-display',
  subsets: ['latin'],
});

const sans = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
});

const mono = Geist_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://example.com'),
  title: {
    default: 'VIBE -- One CRM for your entire real estate empire',
    template: '%s · VIBE',
  },
  description:
    'VIBE is a CRM for real estate teams. Manage leads, track your pipeline, assign deals, and close from one workspace.',
  openGraph: {
    type: 'website',
    siteName: 'VIBE',
    title: 'VIBE -- One CRM for your entire real estate empire',
    description:
      'VIBE is a CRM for real estate teams. Manage leads, track your pipeline, and close from one workspace.',
    url: 'https://example.com',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VIBE -- One CRM for your entire real estate empire',
    description:
      'VIBE is a CRM for real estate teams. Manage leads, track your pipeline, and close from one workspace.',
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'VIBE',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport: Viewport = {
  themeColor: '#D4A017',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'VIBE',
  url: 'https://example.com',
  logo: 'https://example.com/opengraph-image',
  email: 'hello@example.com',
};

const siteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'VIBE',
  url: 'https://example.com',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
      </head>
      <body className={`${display.variable} ${sans.variable} ${mono.variable} font-sans antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
