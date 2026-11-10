import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { HostedFormClient } from './hosted-form-client';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ formId: string }>;
};

async function loadForm(formId: string) {
  const form = await prisma.form.findUnique({
    where: { id: formId },
    select: {
      id: true,
      name: true,
      active: true,
      fields: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          label: true,
          type: true,
          required: true,
          options: true,
        },
      },
      tenant: {
        select: { name: true },
      },
    },
  });
  if (!form || !form.active) return null;
  return form;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { formId } = await params;
  const form = await loadForm(formId).catch(() => null);
  const title = form ? `${form.name} -- VIBE` : 'Form -- VIBE';
  return {
    title,
    robots: { index: false, follow: false },
  };
}

export default async function HostedFormPage({ params }: PageProps) {
  const { formId } = await params;
  const form = await loadForm(formId).catch(() => null);
  if (!form) notFound();

  return (
    <main className="vibe-ink min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #D4A017 1px, transparent 1px), linear-gradient(to bottom, #D4A017 1px, transparent 1px)',
          backgroundSize: '72px 72px',
          maskImage:
            'radial-gradient(ellipse 70% 55% at 50% 45%, black 20%, transparent 85%)',
        }}
      />

      <div className="relative w-full max-w-xl">
        <div className="mb-10 text-center">
          <p className="vibe-eyebrow mb-3">
            {form.tenant?.name ?? 'VIBE'}
          </p>
          <h1 className="vibe-headline text-zinc-100 text-[clamp(28px,4vw,44px)]">
            {form.name}
          </h1>
        </div>

        <div className="rounded-3xl border border-zinc-800 bg-[#14141D] p-8">
          <HostedFormClient
            formId={form.id}
            fields={form.fields.map((f) => ({
              id: f.id,
              label: f.label,
              type: f.type,
              required: f.required,
              options: f.options,
            }))}
          />
        </div>

        <p className="mt-8 text-center font-mono text-[10px] tracking-[0.2em] uppercase text-zinc-600">
          Powered by{' '}
          <a
            href="https://example.com"
            className="vibe-gold hover:underline"
          >
            VIBE
          </a>
        </p>
      </div>
    </main>
  );
}
