'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  ExternalLink,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  savePageBlocks,
  setPagePublished,
  updatePageMeta,
} from '../../../actions';
import { BLOCK_LABELS, emptyBlock, type Block } from '@/lib/sites-blocks';

interface FormOption {
  id: string;
  name: string;
}

interface Props {
  siteId: string;
  pageId: string;
  siteSlug: string;
  pageTitle: string;
  pageSlug: string;
  published: boolean;
  initialBlocks: Block[];
  forms: FormOption[];
}

type BlockType = Block['type'];

const BLOCK_TYPES: BlockType[] = [
  'hero',
  'features',
  'cta',
  'form',
  'idx',
  'blog_list',
  'rich_text',
];

export function PageEditorClient({
  siteId,
  pageId,
  siteSlug,
  pageTitle,
  pageSlug,
  published,
  initialBlocks,
  forms,
}: Props) {
  const router = useRouter();
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [addOpen, setAddOpen] = useState(false);

  function pushBlock(type: BlockType) {
    setBlocks((prev) => [...prev, emptyBlock(type)]);
    setDirty(true);
    setAddOpen(false);
  }

  function updateBlock(index: number, patch: Partial<Block>) {
    setBlocks((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch } as Block;
      return next;
    });
    setDirty(true);
  }

  function removeBlock(index: number) {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  }

  function move(index: number, direction: -1 | 1) {
    setBlocks((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setDirty(true);
  }

  function onSave() {
    setMsg(null);
    startTransition(async () => {
      const res = await savePageBlocks({ siteId, pageId, blocks });
      if (!res.success) {
        setMsg({ kind: 'err', text: res.error });
        return;
      }
      setDirty(false);
      setMsg({ kind: 'ok', text: 'Saved.' });
    });
  }

  function onTogglePublished() {
    setMsg(null);
    if (!published && dirty) {
      setMsg({ kind: 'err', text: 'Save your changes before publishing.' });
      return;
    }
    startTransition(async () => {
      const res = await setPagePublished({ siteId, pageId, published: !published });
      if (!res.success) {
        setMsg({ kind: 'err', text: res.error });
        return;
      }
      router.refresh();
    });
  }

  function onSaveMeta(formData: FormData) {
    const title = String(formData.get('title') ?? '');
    const slug = String(formData.get('slug') ?? '');
    startTransition(async () => {
      const res = await updatePageMeta({ siteId, pageId, title, slug });
      if (!res.success) {
        setMsg({ kind: 'err', text: res.error });
        return;
      }
      setMsg({ kind: 'ok', text: 'Page details saved.' });
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={`/sites/${siteId}`}
          className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to site
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{pageTitle}</h1>
          <p className="mt-1 font-mono text-sm text-zinc-400">
            /p/{siteSlug}/{pageSlug}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {published ? (
            <a
              href={`/p/${siteSlug}/${pageSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-700"
            >
              <ExternalLink className="h-4 w-4" />
              View live
            </a>
          ) : null}
          <button
            type="button"
            onClick={onTogglePublished}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-md border border-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-700 disabled:opacity-50"
          >
            {published ? (
              <>
                <EyeOff className="h-4 w-4" />
                Unpublish
              </>
            ) : (
              <>
                <Eye className="h-4 w-4" />
                Publish
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isPending || !dirty}
            className="inline-flex items-center gap-2 rounded-md bg-[#D4A017] px-4 py-2 text-sm font-semibold text-[#0A0A0F] hover:bg-[#D4A017]/90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {isPending ? 'Saving...' : dirty ? 'Save changes' : 'Saved'}
          </button>
        </div>
      </div>

      {msg ? (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            msg.kind === 'ok'
              ? 'border-emerald-900/60 bg-emerald-500/10 text-emerald-300'
              : 'border-red-900/60 bg-red-500/10 text-red-300'
          }`}
        >
          {msg.text}
        </div>
      ) : null}

      {/* Meta */}
      <details className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-white">Page details</summary>
        <form action={onSaveMeta} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-zinc-300">Title</label>
            <input
              name="title"
              defaultValue={pageTitle}
              maxLength={120}
              className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-[#D4A017] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300">Slug</label>
            <input
              name="slug"
              defaultValue={pageSlug}
              pattern="[a-z0-9](?:[a-z0-9\-]{0,38}[a-z0-9])?"
              className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-sm text-white focus:border-[#D4A017] focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md border border-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-700 disabled:opacity-50"
            >
              Save page details
            </button>
          </div>
        </form>
      </details>

      {/* Blocks */}
      <section className="space-y-4">
        {blocks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center">
            <p className="text-sm text-zinc-400">No blocks yet. Add your first block below.</p>
          </div>
        ) : (
          blocks.map((block, i) => (
            <BlockCard
              key={i}
              index={i}
              total={blocks.length}
              block={block}
              forms={forms}
              onChange={(patch) => updateBlock(i, patch)}
              onRemove={() => removeBlock(i)}
              onMoveUp={() => move(i, -1)}
              onMoveDown={() => move(i, 1)}
            />
          ))
        )}

        <div className="relative">
          <button
            type="button"
            onClick={() => setAddOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-md border border-dashed border-zinc-700 px-4 py-3 text-sm text-zinc-300 hover:border-[#D4A017] hover:text-[#D4A017]"
          >
            <Plus className="h-4 w-4" />
            Add block
          </button>
          {addOpen ? (
            <div className="absolute left-0 z-20 mt-2 w-56 rounded-md border border-zinc-800 bg-zinc-950 p-1 shadow-xl">
              {BLOCK_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => pushBlock(t)}
                  className="block w-full rounded px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-900"
                >
                  {BLOCK_LABELS[t]}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

// ──────────────────────────────────────
// BlockCard -- dispatches to a per-type form
// ──────────────────────────────────────

interface BlockCardProps {
  index: number;
  total: number;
  block: Block;
  forms: FormOption[];
  onChange: (patch: Partial<Block>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function BlockCard({ index, total, block, forms, onChange, onRemove, onMoveUp, onMoveDown }: BlockCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-zinc-500">Block {index + 1}</div>
          <div className="text-sm font-semibold text-white">{BLOCK_LABELS[block.type]}</div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            aria-label="Move up"
            className="rounded-md border border-zinc-800 p-1.5 text-zinc-300 hover:border-zinc-700 disabled:opacity-30"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            aria-label="Move down"
            className="rounded-md border border-zinc-800 p-1.5 text-zinc-300 hover:border-zinc-700 disabled:opacity-30"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove block"
            className="rounded-md border border-zinc-800 p-1.5 text-red-400 hover:border-red-900 hover:text-red-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <BlockFields block={block} forms={forms} onChange={onChange} />
    </div>
  );
}

function BlockFields({
  block,
  forms,
  onChange,
}: {
  block: Block;
  forms: FormOption[];
  onChange: (patch: Partial<Block>) => void;
}) {
  switch (block.type) {
    case 'hero':
      return (
        <div className="space-y-3">
          <Field label="Headline">
            <input
              value={block.headline}
              onChange={(e) => onChange({ headline: e.target.value } as Partial<Block>)}
              maxLength={140}
              className={inputCls}
            />
          </Field>
          <Field label="Subhead">
            <textarea
              value={block.subhead}
              onChange={(e) => onChange({ subhead: e.target.value } as Partial<Block>)}
              maxLength={280}
              rows={2}
              className={inputCls}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="CTA label">
              <input
                value={block.ctaLabel}
                onChange={(e) => onChange({ ctaLabel: e.target.value } as Partial<Block>)}
                maxLength={40}
                className={inputCls}
              />
            </Field>
            <Field label="CTA href">
              <input
                value={block.ctaHref}
                onChange={(e) => onChange({ ctaHref: e.target.value } as Partial<Block>)}
                maxLength={400}
                placeholder="/contact or https://..."
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Background image URL (optional)">
            <input
              value={block.bgImage}
              onChange={(e) => onChange({ bgImage: e.target.value } as Partial<Block>)}
              maxLength={600}
              className={inputCls}
            />
          </Field>
        </div>
      );

    case 'features':
      return (
        <div className="space-y-3">
          <Field label="Section title (optional)">
            <input
              value={block.title}
              onChange={(e) => onChange({ title: e.target.value } as Partial<Block>)}
              maxLength={140}
              className={inputCls}
            />
          </Field>
          <div className="space-y-2">
            {block.items.map((item, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={item.title}
                  onChange={(e) => {
                    const next = [...block.items];
                    next[i] = { ...item, title: e.target.value };
                    onChange({ items: next } as Partial<Block>);
                  }}
                  maxLength={80}
                  placeholder="Feature title"
                  className={`${inputCls} w-1/3`}
                />
                <input
                  value={item.body}
                  onChange={(e) => {
                    const next = [...block.items];
                    next[i] = { ...item, body: e.target.value };
                    onChange({ items: next } as Partial<Block>);
                  }}
                  maxLength={300}
                  placeholder="Short description"
                  className={`${inputCls} flex-1`}
                />
                <button
                  type="button"
                  onClick={() => {
                    const next = block.items.filter((_, idx) => idx !== i);
                    onChange({ items: next } as Partial<Block>);
                  }}
                  aria-label="Remove feature"
                  className="rounded-md border border-zinc-800 p-2 text-red-400 hover:border-red-900"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              disabled={block.items.length >= 12}
              onClick={() =>
                onChange({
                  items: [...block.items, { title: '', body: '' }],
                } as Partial<Block>)
              }
              className="inline-flex items-center gap-1 rounded-md border border-dashed border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-[#D4A017] disabled:opacity-50"
            >
              <Plus className="h-3 w-3" />
              Add feature (max 12)
            </button>
          </div>
        </div>
      );

    case 'cta':
      return (
        <div className="space-y-3">
          <Field label="Headline">
            <input
              value={block.headline}
              onChange={(e) => onChange({ headline: e.target.value } as Partial<Block>)}
              maxLength={140}
              className={inputCls}
            />
          </Field>
          <Field label="Body (optional)">
            <textarea
              value={block.body}
              onChange={(e) => onChange({ body: e.target.value } as Partial<Block>)}
              maxLength={300}
              rows={2}
              className={inputCls}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Button label">
              <input
                value={block.ctaLabel}
                onChange={(e) => onChange({ ctaLabel: e.target.value } as Partial<Block>)}
                maxLength={40}
                className={inputCls}
              />
            </Field>
            <Field label="Button href">
              <input
                value={block.ctaHref}
                onChange={(e) => onChange({ ctaHref: e.target.value } as Partial<Block>)}
                maxLength={400}
                className={inputCls}
              />
            </Field>
          </div>
        </div>
      );

    case 'form':
      return (
        <div className="space-y-3">
          <Field label="Form">
            <select
              value={block.formId}
              onChange={(e) => onChange({ formId: e.target.value } as Partial<Block>)}
              className={inputCls}
            >
              <option value="">Select a form...</option>
              {forms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Heading (optional)">
            <input
              value={block.heading}
              onChange={(e) => onChange({ heading: e.target.value } as Partial<Block>)}
              maxLength={140}
              className={inputCls}
            />
          </Field>
          <Field label="Body (optional)">
            <textarea
              value={block.body}
              onChange={(e) => onChange({ body: e.target.value } as Partial<Block>)}
              maxLength={300}
              rows={2}
              className={inputCls}
            />
          </Field>
        </div>
      );

    case 'idx':
      return (
        <div className="space-y-3">
          <Field label="Provider">
            <select
              value={block.provider}
              onChange={(e) =>
                onChange({
                  provider: e.target.value as typeof block.provider,
                } as Partial<Block>)
              }
              className={inputCls}
            >
              <option value="ihomefinder">iHomeFinder</option>
              <option value="showcase_idx">Showcase IDX</option>
              <option value="idx_broker">IDX Broker</option>
              <option value="realtyna">Realtyna</option>
              <option value="custom">Custom / other</option>
            </select>
          </Field>
          <Field label="Heading (optional)">
            <input
              value={block.heading}
              onChange={(e) => onChange({ heading: e.target.value } as Partial<Block>)}
              maxLength={140}
              className={inputCls}
            />
          </Field>
          <Field label="Embed code (from your IDX vendor)">
            <textarea
              value={block.embedCode}
              onChange={(e) => onChange({ embedCode: e.target.value } as Partial<Block>)}
              maxLength={4000}
              rows={6}
              placeholder="<script>...</script> or <iframe>..."
              className={`${inputCls} font-mono text-xs`}
            />
          </Field>
          <p className="text-xs text-zinc-500">
            Paste the vendor snippet exactly as provided. It renders inside an isolated container.
          </p>
        </div>
      );

    case 'blog_list':
      return (
        <div className="space-y-3">
          <Field label="Heading">
            <input
              value={block.heading}
              onChange={(e) => onChange({ heading: e.target.value } as Partial<Block>)}
              maxLength={140}
              className={inputCls}
            />
          </Field>
          <Field label="Number of posts to show">
            <input
              type="number"
              min={1}
              max={24}
              value={block.limit}
              onChange={(e) =>
                onChange({ limit: Math.min(24, Math.max(1, Number(e.target.value) || 1)) } as Partial<Block>)
              }
              className={inputCls}
            />
          </Field>
        </div>
      );

    case 'rich_text':
      return (
        <div className="space-y-3">
          <Field label="HTML content (sanitized on render)">
            <textarea
              value={block.html}
              onChange={(e) => onChange({ html: e.target.value } as Partial<Block>)}
              maxLength={10_000}
              rows={8}
              className={`${inputCls} font-mono text-xs`}
            />
          </Field>
        </div>
      );
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-sm font-medium text-zinc-300">{label}</div>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputCls =
  'w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-[#D4A017] focus:outline-none';
