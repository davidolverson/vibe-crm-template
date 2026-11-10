import Link from 'next/link';
import type { Block } from '@/lib/sites';
import { listPublishedBlogPosts } from '@/lib/sites';
import { prisma } from '@/lib/prisma';

// ──────────────────────────────────────
// Safe HTML subset for rich_text blocks.
// Allows: paragraphs, headings, lists, links (http/https/mailto/relative),
// bold, italic, code, line breaks. Strips everything else.
// ──────────────────────────────────────

const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'em', 'b', 'i', 'u', 'code', 'pre',
  'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'blockquote', 'a',
]);

const SAFE_HREF_RE = /^(?:https?:\/\/|mailto:|\/|#)/i;

// Strips script/style entirely, removes event handlers, keeps safe tags only.
// Not a full DOMPurify -- deliberate: inputs come from the tenant owner, not public.
function sanitizeHtml(raw: string): string {
  // Drop <script>...</script> and <style>...</style> blocks wholesale
  let html = raw.replace(/<\/?(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '');
  html = html.replace(/<\/?(script|style)[^>]*>/gi, '');

  // Strip on* event handlers from any tag
  html = html.replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // Strip javascript: / data: URLs inside href/src
  html = html.replace(/(href|src)\s*=\s*(?:"(\s*javascript:[^"]*)"|'(\s*javascript:[^']*)')/gi, '$1="#"');
  html = html.replace(/(href|src)\s*=\s*(?:"(\s*data:[^"]*)"|'(\s*data:[^']*)')/gi, '$1="#"');

  // Strip tags not in allowlist. Preserve their inner text.
  html = html.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (match, tag: string) => {
    return ALLOWED_TAGS.has(tag.toLowerCase()) ? match : '';
  });

  // Force safe href on <a>
  html = html.replace(/<a\b([^>]*?)href\s*=\s*"([^"]*)"([^>]*)>/gi, (_m, pre, href, post) => {
    const safe = SAFE_HREF_RE.test(href) ? href : '#';
    return `<a${pre}href="${safe}" rel="noopener noreferrer" target="_blank"${post}>`;
  });

  return html;
}

// ──────────────────────────────────────
// BlockRenderer -- public site pages pass one Block at a time.
// ──────────────────────────────────────

export async function BlockRenderer({
  block,
  siteId,
  siteSlug,
}: {
  block: Block;
  siteId: string;
  siteSlug: string;
}) {
  switch (block.type) {
    case 'hero':
      return <HeroBlock block={block} />;
    case 'features':
      return <FeaturesBlock block={block} />;
    case 'cta':
      return <CtaBlock block={block} />;
    case 'form':
      return <FormBlock block={block} />;
    case 'idx':
      return <IdxBlock block={block} />;
    case 'blog_list':
      return <BlogListBlock block={block} siteId={siteId} siteSlug={siteSlug} />;
    case 'rich_text':
      return <RichTextBlock block={block} />;
  }
}

function HeroBlock({ block }: { block: Extract<Block, { type: 'hero' }> }) {
  const bg = block.bgImage && SAFE_HREF_RE.test(block.bgImage) ? block.bgImage : null;
  return (
    <section className="relative overflow-hidden border-b border-zinc-900 bg-[#0A0A0F] px-6 py-24">
      {bg ? (
        <div className="absolute inset-0 opacity-20">
          {/* Use a plain img -- external URL from user, avoid next/image config */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bg} alt="" className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,160,23,0.12),transparent_60%)]" />
      )}
      <div className="relative mx-auto max-w-4xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">{block.headline}</h1>
        {block.subhead ? (
          <p className="mt-6 text-lg text-zinc-300">{block.subhead}</p>
        ) : null}
        {block.ctaLabel && block.ctaHref ? (
          <div className="mt-8">
            <SafeCta href={block.ctaHref} label={block.ctaLabel} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function FeaturesBlock({ block }: { block: Extract<Block, { type: 'features' }> }) {
  return (
    <section className="border-b border-zinc-900 bg-[#0A0A0F] px-6 py-20">
      <div className="mx-auto max-w-5xl">
        {block.title ? (
          <h2 className="mb-10 text-center text-3xl font-bold text-white">{block.title}</h2>
        ) : null}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {block.items.map((item, i) => (
            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
              <h3 className="text-lg font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm text-zinc-400">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaBlock({ block }: { block: Extract<Block, { type: 'cta' }> }) {
  return (
    <section className="border-b border-zinc-900 bg-[#0A0A0F] px-6 py-20">
      <div className="mx-auto max-w-3xl rounded-2xl border border-[#D4A017]/20 bg-gradient-to-br from-[#D4A017]/10 to-transparent p-10 text-center">
        <h2 className="text-3xl font-bold text-white">{block.headline}</h2>
        {block.body ? <p className="mt-4 text-zinc-300">{block.body}</p> : null}
        <div className="mt-8">
          <SafeCta href={block.ctaHref} label={block.ctaLabel} />
        </div>
      </div>
    </section>
  );
}

async function FormBlock({ block }: { block: Extract<Block, { type: 'form' }> }) {
  if (!block.formId) {
    return <div className="px-6 py-8 text-center text-sm text-zinc-500">Form not configured.</div>;
  }
  const form = await prisma.form.findUnique({
    where: { id: block.formId },
    include: { fields: { orderBy: { position: 'asc' } } },
  });
  if (!form) {
    return <div className="px-6 py-8 text-center text-sm text-zinc-500">Form not found.</div>;
  }

  return (
    <section className="border-b border-zinc-900 bg-[#0A0A0F] px-6 py-20">
      <div className="mx-auto max-w-xl rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8">
        {block.heading ? (
          <h2 className="text-2xl font-bold text-white">{block.heading}</h2>
        ) : null}
        {block.body ? <p className="mt-2 text-sm text-zinc-400">{block.body}</p> : null}
        <form action={`/api/forms/${form.id}/submit`} method="POST" className="mt-6 space-y-4">
          {form.fields.map((f) => (
            <div key={f.id}>
              <label className="block text-sm font-medium text-zinc-300">{f.label}</label>
              <input
                name={f.label}
                type={f.type === 'email' ? 'email' : f.type === 'phone' || f.type === 'tel' ? 'tel' : 'text'}
                required={f.required}
                className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-[#D4A017] focus:outline-none"
              />
            </div>
          ))}
          {/* honeypot */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
          <button
            type="submit"
            className="w-full rounded-md bg-[#D4A017] py-2.5 text-sm font-semibold text-[#0A0A0F] hover:bg-[#D4A017]/90"
          >
            Submit
          </button>
        </form>
      </div>
    </section>
  );
}

function IdxBlock({ block }: { block: Extract<Block, { type: 'idx' }> }) {
  // IDX vendors require their exact embed snippet. We render it verbatim inside
  // an isolated section. The tenant owner owns this content -- if they paste
  // something hostile they've only hurt their own public site. We still strip
  // the obvious footguns as a defense-in-depth check.
  const embed = block.embedCode
    .replace(/<\/?(script|iframe|embed|object)\b[^>]*>/gi, (match) => {
      // keep script + iframe (vendors need them) but drop nested event handlers
      return match.replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');
    });
  return (
    <section className="border-b border-zinc-900 bg-[#0A0A0F] px-6 py-16">
      <div className="mx-auto max-w-6xl">
        {block.heading ? (
          <h2 className="mb-6 text-2xl font-bold text-white">{block.heading}</h2>
        ) : null}
        <div
          className="rounded-lg border border-zinc-800 bg-white p-4"
          dangerouslySetInnerHTML={{ __html: embed }}
        />
      </div>
    </section>
  );
}

async function BlogListBlock({
  block,
  siteId,
  siteSlug,
}: {
  block: Extract<Block, { type: 'blog_list' }>;
  siteId: string;
  siteSlug: string;
}) {
  const posts = await listPublishedBlogPosts(siteId, block.limit);
  if (posts.length === 0) {
    return (
      <section className="border-b border-zinc-900 bg-[#0A0A0F] px-6 py-16">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-2xl font-bold text-white">{block.heading}</h2>
          <p className="mt-4 text-sm text-zinc-500">No posts published yet.</p>
        </div>
      </section>
    );
  }
  return (
    <section className="border-b border-zinc-900 bg-[#0A0A0F] px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-8 text-2xl font-bold text-white">{block.heading}</h2>
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <li key={p.id}>
              <Link
                href={`/p/${siteSlug}/blog/${p.slug}`}
                className="block rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 transition-colors hover:border-[#D4A017]/60"
              >
                {p.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.coverImage}
                    alt=""
                    className="mb-4 aspect-[16/9] w-full rounded-md object-cover"
                  />
                ) : null}
                <h3 className="text-lg font-semibold text-white">{p.title}</h3>
                {p.excerpt ? <p className="mt-2 text-sm text-zinc-400">{p.excerpt}</p> : null}
                <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
                  <span>{p.author}</span>
                  {p.publishedAt ? <time>{new Date(p.publishedAt).toLocaleDateString()}</time> : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function RichTextBlock({ block }: { block: Extract<Block, { type: 'rich_text' }> }) {
  const safe = sanitizeHtml(block.html);
  return (
    <section className="border-b border-zinc-900 bg-[#0A0A0F] px-6 py-16">
      <div
        className="prose prose-invert mx-auto max-w-3xl text-zinc-200"
        dangerouslySetInnerHTML={{ __html: safe }}
      />
    </section>
  );
}

function SafeCta({ href, label }: { href: string; label: string }) {
  const safeHref = SAFE_HREF_RE.test(href) ? href : '#';
  const isExternal = /^https?:\/\//i.test(safeHref);
  if (isExternal) {
    return (
      <a
        href={safeHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center rounded-md bg-[#D4A017] px-6 py-3 text-sm font-semibold text-[#0A0A0F] hover:bg-[#D4A017]/90"
      >
        {label}
      </a>
    );
  }
  return (
    <Link
      href={safeHref}
      className="inline-flex items-center rounded-md bg-[#D4A017] px-6 py-3 text-sm font-semibold text-[#0A0A0F] hover:bg-[#D4A017]/90"
    >
      {label}
    </Link>
  );
}

export { sanitizeHtml };
