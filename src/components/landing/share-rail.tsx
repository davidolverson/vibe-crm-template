'use client';

import { useState } from 'react';
import { toast } from 'sonner';

type ShareRailProps = {
  /** Optional slug appended as ?ref=... for basic referral attribution. */
  refTag?: string;
  /** Copy to pre-fill into social posts / email body. */
  message?: string;
  /** Subject for email share. */
  emailSubject?: string;
  /** URL to share. Defaults to example.com. */
  url?: string;
};

const DEFAULT_URL = 'https://www.example.com';
const DEFAULT_MESSAGE =
  "I just claimed a Founding 50 seat at VIBE -- the CRM for real estate operators running mortgage + insurance + investing under one roof. 50 spots total, locked-in founder pricing forever. Take a look:";
const DEFAULT_SUBJECT = 'You should see this -- VIBE Founding 50';

function withRef(url: string, ref?: string): string {
  if (!ref) return url;
  try {
    const u = new URL(url);
    u.searchParams.set('ref', ref);
    return u.toString();
  } catch {
    return url;
  }
}

export function ShareRail({
  refTag,
  message = DEFAULT_MESSAGE,
  emailSubject = DEFAULT_SUBJECT,
  url = DEFAULT_URL,
}: ShareRailProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = withRef(url, refTag);
  const shareText = `${message}\n${shareUrl}`;

  const xHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
  const linkedinHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  const mailHref = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(shareText)}`;

  function copy() {
    void navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      toast.success('Link copied');
      setTimeout(() => setCopied(false), 1800);
    });
  }

  const btn =
    'flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-zinc-700 bg-[#14141D] text-zinc-200 px-4 py-2.5 text-sm hover:border-[#D4A017]/60 hover:text-[#D4A017] transition-colors';

  return (
    <div className="flex flex-col sm:flex-row gap-2 w-full">
      <a href={xHref} target="_blank" rel="noopener noreferrer" className={btn}>
        <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
          <path
            fill="currentColor"
            d="M18.244 2H21.5l-7.5 8.577L22.5 22h-6.844l-5.362-7.012L4.066 22H.804l8.023-9.177L.5 2h7.006l4.843 6.408L18.244 2Zm-2.397 18.178h1.83L7.286 3.75H5.32l10.527 16.428Z"
          />
        </svg>
        Share on X
      </a>
      <a
        href={linkedinHref}
        target="_blank"
        rel="noopener noreferrer"
        className={btn}
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
          <path
            fill="currentColor"
            d="M4.98 3.5A2.5 2.5 0 1 1 2.5 6 2.5 2.5 0 0 1 4.98 3.5ZM3 8.98h4V22H3Zm6.5 0h3.83v1.77h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.77 2.65 4.77 6.1V22h-4v-5.8c0-1.38-.02-3.16-1.93-3.16-1.93 0-2.23 1.5-2.23 3.06V22h-4Z"
          />
        </svg>
        LinkedIn
      </a>
      <a href={mailHref} className={btn}>
        <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            d="M3 6h18v12H3z M3 6l9 7 9-7"
          />
        </svg>
        Email
      </a>
      <button onClick={copy} className={btn}>
        <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            d="M9 3h10a2 2 0 0 1 2 2v12M7 7H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"
          />
        </svg>
        {copied ? 'Copied' : 'Copy link'}
      </button>
    </div>
  );
}
