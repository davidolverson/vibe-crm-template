'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';
import { provisionWorkspace } from './actions';

const inputClass =
  'block w-full rounded-[2px] border-0 border-b border-[#C9BFA8] bg-transparent px-0 py-2.5 text-[15px] text-[#1A1512] placeholder:text-[#A89E85] focus:border-[#D4A017] focus:outline-none focus:ring-0 transition-colors';
const labelClass =
  'mb-1.5 block font-mono text-[10px] uppercase tracking-[0.3em] text-[#5C554E]';

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function OnboardingPage() {
  const router = useRouter();
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slugPreview = useMemo(() => toSlug(orgName), [orgName]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const name = orgName.trim();
    if (!name) return;
    const slug = toSlug(name);
    if (!slug) {
      setError('That name needs at least one letter or number.');
      return;
    }
    setLoading(true);
    try {
      const result = await authClient.organization.create({ name, slug });
      if (result.error) {
        const msg = result.error.message ?? 'Could not open the workspace.';
        setError(msg);
        toast.error(msg);
        return;
      }
      if (result.data?.id) {
        await authClient.organization.setActive({ organizationId: result.data.id });
        const provision = await provisionWorkspace(result.data.id, name);
        if (provision.error) {
          setError(provision.error);
          toast.error(provision.error);
          return;
        }
      }
      router.push('/dashboard');
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Something went wrong on our end. Try again in a moment.';
      console.error('[onboarding]', err);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.3em] text-[#8A817A]">
        Step 02 · Brokerage
      </p>
      <h1 className="font-display text-[32px] font-[500] leading-[1.05] tracking-[-0.01em] text-[#1A1512]">
        Name the firm.
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[#5C554E]">
        This becomes your workspace. You can rename it later.
      </p>

      <form onSubmit={handleSubmit} className="mt-7 space-y-5" noValidate>
        <div>
          <label htmlFor="org-name" className={labelClass}>Brokerage name</label>
          <input
            id="org-name"
            name="org-name"
            required
            autoFocus
            autoComplete="organization"
            placeholder="Acme Realty Group"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            className={inputClass}
          />
          <p className="mt-2 font-mono text-[11px] tracking-[0.05em] text-[#8A817A]">
            <span className="text-[#A89E85]">example.com/</span>
            <span className="text-[#8B6914]">{slugPreview || 'your-brokerage'}</span>
          </p>
        </div>

        {error && (
          <p className="rounded-[2px] border border-[#8B2A14]/30 bg-[#FBEEE8] px-3 py-2 text-[13px] text-[#6B1F0E]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !orgName.trim()}
          className="w-full rounded-[2px] bg-[#1A1512] px-4 py-3.5 text-[13px] font-[500] uppercase tracking-[0.25em] text-[#F5F1EA] transition-colors hover:bg-[#D4A017] hover:text-[#1A1512] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Opening workspace…' : 'Open workspace'}
        </button>
      </form>

      <div className="mt-7 border-t border-[#D4A017]/20 pt-5">
        <p className="text-center font-mono text-[11px] uppercase tracking-[0.2em] text-[#8A817A]">
          Solo for now. You can invite agents once inside.
        </p>
      </div>
    </>
  );
}
