import Link from 'next/link';
import { listInstalledPipelines } from './actions';
import { PipelinesClient } from './pipelines-client';

export const metadata = { title: 'Pipelines | VIBE Settings' };

export default async function PipelinesSettingsPage() {
  const data = await listInstalledPipelines();

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-8">
      <div>
        <Link href="/settings" className="text-sm text-zinc-500 hover:text-[#D4A017]">
          &larr; Back to Settings
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-white">Pipelines</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Install the pipeline templates for the lines of business you operate. A vertically-integrated
          shop typically runs all four: Real Estate, Mortgage, Insurance, Investment.
        </p>
      </div>

      <PipelinesClient installed={data.installed} available={data.available} />
    </div>
  );
}
