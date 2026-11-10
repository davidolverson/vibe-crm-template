import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getPublishedSiteBySlug } from '@/lib/sites';
import { getPublishedBlogPost, listRelatedPosts } from '@/lib/blog-posts';
import { sanitizeHtml } from '@/components/sites/blocks';
import { SiteTracker } from '../../../site-tracker';

interface Params {
  params: Promise<{ siteSlug: string; postSlug: string }>;
}

export const revalidate = 60;

export async function generateMetadata({ params }: Params) {
  const { siteSlug, postSlug } = await params;
  const site = await getPublishedSiteBySlug(siteSlug);
  if (!site) return { title: 'Not found' };
  const post = await getPublishedBlogPost(site.id, postSlug);
  if (!post) return { title: 'Not found' };
  return {
    title: `${post.title} | ${site.name}`,
    description: post.excerpt ?? undefined,
    openGraph: { title: post.title, description: post.excerpt ?? undefined },
  };
}

export default async function PublicBlogPostPage({ params }: Params) {
  const { siteSlug, postSlug } = await params;
  const site = await getPublishedSiteBySlug(siteSlug);
  if (!site) notFound();

  const post = await getPublishedBlogPost(site.id, postSlug);
  if (!post) notFound();

  const related = await listRelatedPosts(site.id, post.id, 3);

  const body = post.content ? sanitizeHtml(post.content) : '';

  return (
    <main className="min-h-screen bg-[#0A0A0F] text-white">
      <SiteTracker siteId={site.id} pagePath={`/p/${site.slug}/blog/${post.slug}`} />

      <article className="mx-auto max-w-3xl px-6 py-16">
        <Link
          href={`/p/${site.slug}`}
          className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {site.name}
        </Link>

        {post.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.coverImage}
            alt=""
            className="mt-8 aspect-[16/9] w-full rounded-xl object-cover"
          />
        ) : null}

        <header className="mt-10">
          <h1 className="text-4xl font-bold tracking-tight">{post.title}</h1>
          <p className="mt-4 flex items-center gap-3 text-sm text-zinc-400">
            <span>{post.author}</span>
            {post.publishedAt ? (
              <>
                <span className="text-zinc-700">·</span>
                <time>{new Date(post.publishedAt).toLocaleDateString()}</time>
              </>
            ) : null}
          </p>
          {post.excerpt ? (
            <p className="mt-6 text-lg text-zinc-300">{post.excerpt}</p>
          ) : null}
        </header>

        {body ? (
          <div
            className="prose prose-invert mt-10 max-w-none text-zinc-200"
            dangerouslySetInnerHTML={{ __html: body }}
          />
        ) : (
          <p className="mt-10 text-sm text-zinc-500">This post has no body content yet.</p>
        )}
      </article>

      {related.length > 0 ? (
        <section className="border-t border-zinc-900 bg-[#0A0A0F] px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-6 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              More from {site.name}
            </h2>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <li key={r.id} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
                  <Link href={`/p/${site.slug}/blog/${r.slug}`} className="block">
                    <h3 className="text-lg font-semibold text-white hover:text-[#D4A017]">
                      {r.title}
                    </h3>
                    {r.excerpt ? <p className="mt-2 text-sm text-zinc-400">{r.excerpt}</p> : null}
                    <p className="mt-3 text-xs text-zinc-500">
                      {r.author}
                      {r.publishedAt ? ` · ${new Date(r.publishedAt).toLocaleDateString()}` : ''}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <footer className="border-t border-zinc-900 px-6 py-8 text-center text-xs text-zinc-500">
        Powered by{' '}
        <a href="https://example.com" className="text-[#D4A017] hover:underline">
          VIBE
        </a>
      </footer>
    </main>
  );
}
