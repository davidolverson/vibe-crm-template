import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  body: string;
  primary: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  secondary?: {
    label: string;
    href: string;
  };
};

/**
 * Canonical empty-state card used on /contacts, /pipeline, /tasks, /forms
 * when a tenant has no rows yet. Aligns with Phase 12 activation spec:
 * oversized muted icon, headline, one-line body, gold primary CTA, plus
 * a secondary "set up a lead form" link so users on day 1 can get to the
 * real activation path.
 */
export function EmptyState({
  icon: Icon,
  title,
  body,
  primary,
  secondary,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6 rounded-2xl border border-border bg-card">
      <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-2xl border border-border bg-muted/40">
        <Icon className="w-8 h-8 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <h3 className="font-semibold text-xl mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md mb-6 leading-relaxed">{body}</p>
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {primary.href ? (
          <Link
            href={primary.href}
            className="inline-flex items-center justify-center rounded-lg bg-[#D4A017] text-[#0A0A0F] font-semibold px-5 py-2.5 hover:brightness-110 transition-[filter]"
          >
            {primary.label}
          </Link>
        ) : (
          <button
            onClick={primary.onClick}
            className="inline-flex items-center justify-center rounded-lg bg-[#D4A017] text-[#0A0A0F] font-semibold px-5 py-2.5 hover:brightness-110 transition-[filter]"
          >
            {primary.label}
          </button>
        )}
        {secondary ? (
          <Link
            href={secondary.href}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 decoration-border hover:decoration-foreground"
          >
            {secondary.label}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
