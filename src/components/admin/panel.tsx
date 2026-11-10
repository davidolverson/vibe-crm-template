import type { ReactNode } from 'react';

type Props = {
  title: string;
  /** Optional right-aligned meta slot (e.g. a count or timestamp). */
  meta?: ReactNode;
  children: ReactNode;
};

export function Panel({ title, meta, children }: Props) {
  return (
    <section className="rounded-[2px] border border-[#27272A] bg-[#18181B] p-6">
      <header className="mb-5 flex items-baseline justify-between gap-4">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#71717A]">
          {title}
        </h2>
        {meta ? (
          <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#52525B]">
            {meta}
          </span>
        ) : null}
      </header>
      {children}
    </section>
  );
}
