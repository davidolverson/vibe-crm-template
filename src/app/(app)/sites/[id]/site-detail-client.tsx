'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, FileText, Trash2, ExternalLink, X, Save } from 'lucide-react';
import {
  createPage,
  deletePage,
  setPagePublished,
  updateSite,
  setSiteStatus,
} from '../actions';

interface PageRow {
  id: string;
  title: string;
  slug: string;
  published: boolean;
  updatedAt: Date;
}

interface Site {
  id: string;
  name: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  idxProvider: string | null;
  idxConfig: unknown;
  pages: PageRow[];
}

interface Props {
  site: Site;
}

export function SiteDetailClient({ site }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showCreatePage, setShowCreatePage] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [settingsMsg, setSettingsMsg] = useState<string | null>(null);

  const idxHint =
    site.idxConfig && typeof site.idxConfig === 'object' && 'embedHint' in site.idxConfig
      ? String((site.idxConfig as Record<string, unknown>).embedHint ?? '')
      : '';

  function onCreatePage(formData: FormData) {
    setPageError(null);
    const title = String(formData.get('title') ?? '');
    const slug = String(formData.get('slug') ?? '');
    startTransition(async () => {
      const res = await createPage({ siteId: site.id, title, slug });
      if (!res.success) {
        setPageError(res.error);
        return;
      }
      setShowCreatePage(false);
      router.push(`/sites/${site.id}/pages/${res.data.id}`);
    });
  }

  function onDeletePage(id: string, title: string) {
    if (!confirm(`Delete page "${title}"?`)) return;
    startTransition(async () => {
      const res = await deletePage({ siteId: site.id, pageId: id });
      if (!res.success) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  }

  function onTogglePage(id: string, published: boolean) {
    startTransition(async () => {
      const res = await setPagePublished({ siteId: site.id, pageId: id, published });
      if (!res.success) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  }

  function onSaveSettings(formData: FormData) {
    setSettingsMsg(null);
    const name = String(formData.get('name') ?? '');
    const slug = String(formData.get('slug') ?? '');
    const idxProvider = String(formData.get('idxProvider') ?? '') || null;
    const idxEmbedHint = String(formData.get('idxEmbedHint') ?? '') || null;
    startTransition(async () => {
      const res = await updateSite({ id: site.id, name, slug, idxProvider, idxEmbedHint });
      if (!res.success) {
        setSettingsMsg(`Error: ${res.error}`);
        return;
      }
      setSettingsMsg('Saved.');
      router.refresh();
    });
  }

  function onTogglePublished() {
    const next = site.status === 'published' ? 'draft' : 'published';
    startTransition(async () => {
      const res = await setSiteStatus({ id: site.id, status: next });
      if (!res.success) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/sites"
          className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          All sites
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{site.name}</h1>
          <p className="mt-1 text-sm text-zinc-400">
            <span className="font-mono">/p/{site.slug}</span>
            <StatusDot status={site.status} />
          </p>
        </div>
        <div className="flex items-center gap-2">
          {site.status === 'published' ? (
            <a
              href={`/p/${site.slug}`}
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
            className="rounded-md border border-zinc-800 px-3 py-2 text-sm text-zinc-200 hover:border-zinc-700 disabled:opacity-50"
          >
            {site.status === 'published' ? 'Unpublish site' : 'Publish site'}
          </button>
        </div>
      </div>

      {/* Pages */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Pages</h2>
          <button
            type="button"
            onClick={() => setShowCreatePage(true)}
            className="inline-flex items-center gap-2 rounded-md bg-[#D4A017] px-3 py-1.5 text-xs font-semibold text-[#0A0A0F] hover:bg-[#D4A017]/90"
          >
            <Plus className="h-3.5 w-3.5" />
            New page
          </button>
        </div>

        {site.pages.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-zinc-800 p-8 text-center">
            <FileText className="mx-auto h-8 w-8 text-zinc-600" />
            <p className="mt-3 text-sm text-zinc-400">
              No pages yet. Add a home page (slug: <span className="font-mono text-zinc-300">home</span>) to
              get started.
            </p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-800/60">
            {site.pages.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-3">
                <div>
                  <Link
                    href={`/sites/${site.id}/pages/${p.id}`}
                    className="text-sm font-medium text-zinc-100 hover:text-[#D4A017]"
                  >
                    {p.title}
                  </Link>
                  <p className="mt-0.5 font-mono text-xs text-zinc-500">
                    /p/{site.slug}/{p.slug}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => onTogglePage(p.id, !p.published)}
                    className={`rounded-md border px-2 py-1 text-xs ${
                      p.published
                        ? 'border-emerald-900/60 bg-emerald-500/10 text-emerald-400'
                        : 'border-zinc-800 text-zinc-300 hover:border-zinc-700'
                    } disabled:opacity-50`}
                  >
                    {p.published ? 'Published' : 'Draft'}
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => onDeletePage(p.id, p.title)}
                    aria-label="Delete page"
                    className="rounded-md border border-zinc-800 p-1.5 text-red-400 hover:border-red-900 hover:text-red-300 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Settings */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-sm font-semibold text-white">Site settings</h2>
        <form action={onSaveSettings} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-300">Name</label>
              <input
                name="name"
                defaultValue={site.name}
                maxLength={80}
                className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-[#D4A017] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300">Slug</label>
              <input
                name="slug"
                defaultValue={site.slug}
                minLength={2}
                maxLength={40}
                pattern="[a-z0-9](?:[a-z0-9\-]{0,38}[a-z0-9])?"
                className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-sm text-white focus:border-[#D4A017] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-300">IDX provider</label>
              <select
                name="idxProvider"
                defaultValue={site.idxProvider ?? ''}
                className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-[#D4A017] focus:outline-none"
              >
                <option value="">None</option>
                <option value="ihomefinder">iHomeFinder</option>
                <option value="showcase_idx">Showcase IDX</option>
                <option value="idx_broker">IDX Broker</option>
                <option value="realtyna">Realtyna</option>
                <option value="custom">Custom / other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300">IDX embed hint</label>
              <input
                name="idxEmbedHint"
                defaultValue={idxHint}
                maxLength={200}
                placeholder="Widget ID or short note"
                className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-[#D4A017] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500">
              Full IDX embed code goes on the page-level IDX block.
            </p>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-md bg-[#D4A017] px-4 py-2 text-sm font-semibold text-[#0A0A0F] hover:bg-[#D4A017]/90 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Save settings
            </button>
          </div>
          {settingsMsg ? (
            <p
              className={`text-xs ${settingsMsg.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}
            >
              {settingsMsg}
            </p>
          ) : null}
        </form>
      </section>

      {showCreatePage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form
            action={onCreatePage}
            className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-6"
          >
            <div className="mb-4 flex items-start justify-between">
              <h2 className="text-lg font-semibold text-white">New page</h2>
              <button
                type="button"
                onClick={() => {
                  setShowCreatePage(false);
                  setPageError(null);
                }}
                className="rounded-md p-1 text-zinc-400 hover:bg-zinc-900 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="block text-sm font-medium text-zinc-300">Title</label>
            <input
              name="title"
              required
              maxLength={120}
              placeholder="Home"
              className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-[#D4A017] focus:outline-none"
            />

            <label className="mt-4 block text-sm font-medium text-zinc-300">Slug</label>
            <input
              name="slug"
              required
              minLength={2}
              maxLength={40}
              pattern="[a-z0-9](?:[a-z0-9\-]{0,38}[a-z0-9])?"
              placeholder="home"
              defaultValue="home"
              className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-sm text-white focus:border-[#D4A017] focus:outline-none"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Use <span className="font-mono">home</span> for the root page.
            </p>

            {pageError ? <p className="mt-3 text-sm text-red-400">{pageError}</p> : null}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowCreatePage(false);
                  setPageError(null);
                }}
                className="rounded-md border border-zinc-800 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-md bg-[#D4A017] px-4 py-2 text-sm font-semibold text-[#0A0A0F] hover:bg-[#D4A017]/90 disabled:opacity-50"
              >
                {isPending ? 'Creating...' : 'Create page'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function StatusDot({ status }: { status: 'draft' | 'published' | 'archived' }) {
  const color =
    status === 'published' ? 'text-emerald-400' : status === 'archived' ? 'text-zinc-500' : 'text-amber-400';
  return <span className={`ml-2 ${color}`}>• {status}</span>;
}
