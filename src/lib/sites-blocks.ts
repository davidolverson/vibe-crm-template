// Client-safe block types and helpers. Split from src/lib/sites.ts so it
// can be imported by client components without pulling in the Prisma
// client (which Turbopack otherwise tries to chunk into the browser bundle
// and fails on `node:module`).

import { z } from 'zod';

export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, 'Slug must be at least 2 characters')
  .max(40, 'Slug must be at most 40 characters')
  .regex(SLUG_RE, 'Slug may contain lowercase letters, digits, and hyphens; must start and end with letter or digit');

export const nameSchema = z.string().trim().min(2, 'Name required').max(80, 'Name too long');

// ──────────────────────────────────────
// BLOCK SCHEMAS
// ──────────────────────────────────────

export const heroBlockSchema = z.object({
  type: z.literal('hero'),
  headline: z.string().max(140),
  subhead: z.string().max(280).optional().default(''),
  ctaLabel: z.string().max(40).optional().default(''),
  ctaHref: z.string().max(400).optional().default(''),
  bgImage: z.string().max(600).optional().default(''),
});

export const featuresBlockSchema = z.object({
  type: z.literal('features'),
  title: z.string().max(140).optional().default(''),
  items: z
    .array(
      z.object({
        title: z.string().max(80),
        body: z.string().max(300),
      })
    )
    .max(12),
});

export const ctaBlockSchema = z.object({
  type: z.literal('cta'),
  headline: z.string().max(140),
  body: z.string().max(300).optional().default(''),
  ctaLabel: z.string().max(40),
  ctaHref: z.string().max(400),
});

export const formBlockSchema = z.object({
  type: z.literal('form'),
  formId: z.string().uuid(),
  heading: z.string().max(140).optional().default(''),
  body: z.string().max(300).optional().default(''),
});

export const idxBlockSchema = z.object({
  type: z.literal('idx'),
  provider: z.enum(['ihomefinder', 'showcase_idx', 'idx_broker', 'realtyna', 'custom']),
  embedCode: z.string().max(4000),
  heading: z.string().max(140).optional().default(''),
});

export const blogListBlockSchema = z.object({
  type: z.literal('blog_list'),
  heading: z.string().max(140).optional().default('Latest posts'),
  limit: z.number().int().min(1).max(24).default(6),
});

export const richTextBlockSchema = z.object({
  type: z.literal('rich_text'),
  html: z.string().max(10_000),
});

export const blockSchema = z.discriminatedUnion('type', [
  heroBlockSchema,
  featuresBlockSchema,
  ctaBlockSchema,
  formBlockSchema,
  idxBlockSchema,
  blogListBlockSchema,
  richTextBlockSchema,
]);

export type Block = z.infer<typeof blockSchema>;

export const BLOCK_LABELS: Record<Block['type'], string> = {
  hero: 'Hero',
  features: 'Features',
  cta: 'Call to action',
  form: 'Lead capture form',
  idx: 'IDX listings',
  blog_list: 'Blog list',
  rich_text: 'Rich text',
};

export function emptyBlock(type: Block['type']): Block {
  switch (type) {
    case 'hero':
      return { type: 'hero', headline: 'Headline goes here', subhead: '', ctaLabel: '', ctaHref: '', bgImage: '' };
    case 'features':
      return { type: 'features', title: '', items: [] };
    case 'cta':
      return { type: 'cta', headline: 'Ready to talk?', body: '', ctaLabel: 'Get in touch', ctaHref: '/' };
    case 'form':
      return { type: 'form', formId: '', heading: '', body: '' };
    case 'idx':
      return { type: 'idx', provider: 'ihomefinder', embedCode: '', heading: '' };
    case 'blog_list':
      return { type: 'blog_list', heading: 'Latest posts', limit: 6 };
    case 'rich_text':
      return { type: 'rich_text', html: '' };
  }
}

export function parseBlocks(raw: unknown): Block[] {
  if (!Array.isArray(raw)) return [];
  const out: Block[] = [];
  for (const entry of raw) {
    const parsed = blockSchema.safeParse(entry);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}
