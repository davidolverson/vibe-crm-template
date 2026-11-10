import type { Metadata } from 'next';
import { LandingNav } from '@/components/landing/nav';
import { LandingFooter } from '@/components/landing/footer';
import { ContactForm } from '@/components/landing/contact-form';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Reach the VIBE team. Founding 50 inquiries, pricing questions, and product feedback -- one form, one business-day reply.',
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <>
      <LandingNav />

      <main className="vibe-ink min-h-screen pt-32 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="vibe-eyebrow mb-4">Contact</p>
          <h1 className="vibe-headline text-zinc-100 text-[clamp(40px,6vw,72px)] mb-6">
            Talk to the team.
            <br />
            <span className="vibe-gold italic">One human reply.</span>
          </h1>
          <p className="text-zinc-400 text-lg leading-relaxed mb-12 max-w-2xl">
            We&rsquo;re small on purpose. A founder reads every message and
            routes it. Founding 50 questions get priority; everything else
            lands within one business day.
          </p>

          <ContactForm />
        </div>
      </main>

      <LandingFooter />
    </>
  );
}
