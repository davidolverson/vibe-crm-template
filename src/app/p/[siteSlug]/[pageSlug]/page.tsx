import { notFound } from 'next/navigation';
import { getPublishedSiteBySlug, getPublishedPage, parseBlocks } from '@/lib/sites';
import { BlockRenderer } from '@/components/sites/blocks';
import { SiteTracker } from '../../site-tracker';

interface Params {
  params: Promise<{ siteSlug: string; pageSlug: string }>;
}

export const revalidate = 60;

export async function generateMetadata({ params }: Params) {
  const { siteSlug, pageSlug } = await params;
  const site = await getPublishedSiteBySlug(siteSlug);
  if (!site) return { title: 'Not found' };
  const page = await getPublishedPage(site.id, pageSlug);
  if (!page) return { title: 'Not found' };
  return { title: `${page.title} | ${site.name}` };
}

export default async function PublicSitePage({ params }: Params) {
  const { siteSlug, pageSlug } = await params;
  const site = await getPublishedSiteBySlug(siteSlug);
  if (!site) notFound();

  const page = await getPublishedPage(site.id, pageSlug);
  if (!page) notFound();

  const blocks = parseBlocks(page.content);

  return (
    <main className="min-h-screen bg-[#0A0A0F] text-white">
      <SiteTracker siteId={site.id} pagePath={`/p/${site.slug}/${page.slug}`} />
      {blocks.map((block, i) => (
        <BlockRenderer key={i} block={block} siteId={site.id} siteSlug={site.slug} />
      ))}
      <footer className="border-t border-zinc-900 bg-[#0A0A0F] px-6 py-8 text-center text-xs text-zinc-500">
        Powered by <a href="https://example.com" className="text-[#D4A017] hover:underline">VIBE</a>
      </footer>
    </main>
  );
}
