'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Globe, Trash2, ExternalLink, X, FileText } from 'lucide-react';
import { createSite, deleteSite, setSiteStatus } from './actions';

type SiteSummary = {
  id: string;
  name: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  domain: string | null;
  pageCount: number;
  updatedAt: Date;
};

interface Limit {
  allowed: boolean;
  current: number;
  max: number;
  resource: string;
}

interface SitesClientProps {
  sites: SiteSummary[];
  canCreate: boolean;
  limit: Limit;
}

export function SitesClient({ sites, canCreate, limit }: SitesClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onCreate(formData: FormData) {
    setError(null);
    const name = String(formData.get('name') ?? '');
    const slug = String(formData.get('slug') ?? '');
    startTransition(async () => {
      const res = await createSite({ name, slug });
      if (!res.success) {
        setError(res.error);
        return;
      }
      setShowCreate(false);
      router.push(`/sites/${res.data.id}`);
      router.refresh();
    });
  }

  function onDelete(id: string) {
    if (!confirm('Delete this site and all its pages? This cannot be undone.')) return;
    startTransition(async () => {
      const res = await deleteSite(id);
      if (!res.success) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  }

  function onPublish(id: string, next: 'draft' | 'published') {
    startTransition(async () => {
      const res = await setSiteStatus({ id, status: next });
      if (!res.success) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Sites</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Lightweight landing, authority, and campaign sites wired to your lead capture forms.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500">
            {limit.current} of {limit.max} sites used
          </span>
          <button
            type="button"
            disabled={!canCreate || isPending}
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-md bg-[#D4A017] px-3 py-2 text-sm font-semibold text-[#0A0A0F] hover:bg-[#D4A017]/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            New site
          </button>
        </div>
      </div>

      {sites.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-12 text-center">
          <Globe className="mx-auto h-10 w-10 text-zinc-600" />
          <h2 className="mt-4 text-lg font-semibold text-white">No sites yet</h2>
          <p className="mt-2 max-w-md mx-auto text-sm text-zinc-400">
            Sites are standalone landing or authority pages that share your CRM forms, contacts, and
            IDX configuration. Create one per line of business.
          </p>
          {canCreate ? (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-[#D4A017] px-4 py-2 text-sm font-semibold text-[#0A0A0F] hover:bg-[#D4A017]/90"
            >
              <Plus className="h-4 w-4" />
              Create your first site
            </button>
          ) : null}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/60 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Slug</th>
                <th className="px-4 py-3 text-left">Pages</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((s) => (
                <tr key={s.id} className="border-t border-zinc-800/60">
                  <td className="px-4 py-3 text-zinc-200">
                    <Link href={`/sites/${s.id}`} className="hover:text-[#D4A017]">
                      {s.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-400">{s.slug}</td>
                  <td className="px-4 py-3 text-zinc-400">
                    <span className="inline-flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      {s.pageCount}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={s.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {s.status === 'published' ? (
                        <a
                          href={`/p/${s.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:border-zinc-700"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          View
                        </a>
                      ) : null}
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          onPublish(s.id, s.status === 'published' ? 'draft' : 'published')
                        }
                        className="rounded-md border border-zinc-800 px-2 py-1 text-xs text-zinc-300 hover:border-zinc-700 disabled:opacity-50"
                      >
                        {s.status === 'published' ? 'Unpublish' : 'Publish'}
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => onDelete(s.id)}
                        aria-label="Delete site"
                        className="rounded-md border border-zinc-800 p-1.5 text-red-400 hover:border-red-900 hover:text-red-300 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <form
            action={onCreate}
            className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-6"
          >
            <div className="mb-4 flex items-start justify-between">
              <h2 className="text-lg font-semibold text-white">New site</h2>
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setError(null);
                }}
                className="rounded-md p-1 text-zinc-400 hover:bg-zinc-900 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="block text-sm font-medium text-zinc-300">Name</label>
            <input
              name="name"
              required
              maxLength={80}
              placeholder="Main brokerage site"
              className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-[#D4A017] focus:outline-none"
            />

            <label className="mt-4 block text-sm font-medium text-zinc-300">
              Slug
              <span className="ml-2 text-xs font-normal text-zinc-500">
                /p/<span className="text-[#D4A017]">your-slug</span>
              </span>
            </label>
            <input
              name="slug"
              required
              minLength={2}
              maxLength={40}
              pattern="[a-z0-9](?:[a-z0-9\-]{0,38}[a-z0-9])?"
              placeholder="main-brokerage"
              className="mt-1 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-sm text-white placeholder:text-zinc-600 focus:border-[#D4A017] focus:outline-none"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Lowercase letters, digits, and hyphens. 2-40 characters.
            </p>

            {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setError(null);
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
                {isPending ? 'Creating...' : 'Create site'}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function StatusPill({ status }: { status: 'draft' | 'published' | 'archived' }) {
  const tone =
    status === 'published'
      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
      : status === 'archived'
        ? 'bg-zinc-800/60 text-zinc-400 border-zinc-700'
        : 'bg-amber-500/10 text-amber-400 border-amber-500/30';
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs capitalize ${tone}`}>
      {status}
    </span>
  );
}
