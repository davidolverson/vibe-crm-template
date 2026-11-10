import type { Metadata } from 'next';
import { LandingNav } from '@/components/landing/nav';
import { Hero } from '@/components/landing/hero';
import { PainPoints } from '@/components/landing/pain-points';
import { Solves } from '@/components/landing/solves';
import { Battlefield } from '@/components/landing/battlefield';
import { Showcase } from '@/components/landing/showcase';
import { DayCompare } from '@/components/landing/day-compare';
import { HowItWorks } from '@/components/landing/how-it-works';
import { VoiceOfMarket } from '@/components/landing/voice-of-market';
import { TechFlex } from '@/components/landing/tech-flex';
import { Founding } from '@/components/landing/founding';
import { FinalCTA } from '@/components/landing/final-cta';
import { LandingFooter } from '@/components/landing/footer';
import { getFoundingSpotsRemaining } from '@/lib/waitlist';

export const metadata: Metadata = {
  title: 'VIBE -- One CRM for your entire real estate empire',
  description:
    'VIBE is the CRM built for vertically integrated real estate operators. Unified leads across real estate, mortgage, insurance, and investing. Multi-site capture. QuickBooks-synced financials. Now live, Founding 50 open.',
  alternates: { canonical: 'https://example.com' },
  openGraph: {
    title: 'VIBE -- One CRM for your entire real estate empire',
    description:
      'Unified leads, multi-site capture, and QuickBooks-synced financials for operators running real estate + mortgage + insurance under one roof. Join the Founding 50.',
    url: 'https://example.com',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VIBE -- One CRM for your entire real estate empire',
    description:
      'CRM for vertically integrated real estate operators. Now live, Founding 50 open.',
  },
};

const softwareJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'VIBE',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description:
    'CRM for vertically integrated real estate operators -- unified leads across real estate, mortgage, insurance, and investing with multi-site capture and QuickBooks-synced financials. Founding 50 open.',
  offers: {
    '@type': 'Offer',
    priceCurrency: 'USD',
    price: '600',
    description: 'Founding member pricing, Starter plan',
  },
};

export default async function HomePage() {
  const foundingSpotsRemaining = await getFoundingSpotsRemaining();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />

      <LandingNav />

      <main className="vibe-ink">
        <Hero foundingSpotsRemaining={foundingSpotsRemaining} />
        <PainPoints />
        <Solves />
        <Showcase />
        <Battlefield />
        <DayCompare />
        <HowItWorks />
        <VoiceOfMarket />
        <TechFlex />
        <Founding foundingSpotsRemaining={foundingSpotsRemaining} />
        <FinalCTA />
      </main>

      <LandingFooter />
    </>
  );
}
