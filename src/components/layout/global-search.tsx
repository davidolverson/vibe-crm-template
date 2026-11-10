'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Users, Kanban, CheckSquare, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { searchGlobal, type GlobalSearchResult } from '@/app/(app)/search-action';

type ResultItem =
  | { type: 'contact'; id: string; label: string; sub: string | null }
  | { type: 'deal'; id: string; label: string; sub: null }
  | { type: 'task'; id: string; label: string; sub: string };

function flattenResults(results: GlobalSearchResult): ResultItem[] {
  const items: ResultItem[] = [];
  for (const c of results.contacts) {
    items.push({
      type: 'contact',
      id: c.id,
      label: c.name ?? 'Unnamed contact',
      sub: c.email,
    });
  }
  for (const d of results.deals) {
    items.push({ type: 'deal', id: d.id, label: d.name, sub: null });
  }
  for (const t of results.tasks) {
    items.push({ type: 'task', id: t.id, label: t.title, sub: t.status });
  }
  return items;
}

function hrefFor(item: ResultItem): string {
  if (item.type === 'contact') return `/contacts/${item.id}`;
  if (item.type === 'deal') return '/pipeline';
  return '/tasks';
}

const GROUP_META = {
  contact: { label: 'Contacts', Icon: Users },
  deal: { label: 'Deals', Icon: Kanban },
  task: { label: 'Tasks', Icon: CheckSquare },
} as const;

export function GlobalSearch() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const flat = results ? flattenResults(results) : [];
  const hasResults =
    results !== null &&
    (results.contacts.length > 0 ||
      results.deals.length > 0 ||
      results.tasks.length > 0);

  const closeDropdown = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, []);

  const navigate = useCallback(
    (item: ResultItem) => {
      router.push(hrefFor(item));
      closeDropdown();
      setQuery('');
      setResults(null);
    },
    [router, closeDropdown]
  );

  // Cmd/Ctrl+K focus shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        closeDropdown();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [closeDropdown]);

  const handleChange = useCallback((value: string) => {
    setQuery(value);
    setActiveIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setResults(null);
      setOpen(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const data = await searchGlobal(value);
      setResults(data);
      setOpen(true);
      setLoading(false);
    }, 300);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        closeDropdown();
        inputRef.current?.blur();
        return;
      }

      if (!open || flat.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, flat.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const target = activeIndex >= 0 ? flat[activeIndex] : flat[0];
        if (target) navigate(target);
      }
    },
    [open, flat, activeIndex, navigate, closeDropdown]
  );

  const handleClear = () => {
    setQuery('');
    setResults(null);
    setOpen(false);
    setActiveIndex(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    inputRef.current?.focus();
  };

  const types = (['contact', 'deal', 'task'] as const).filter(
    (t) =>
      results &&
      results[t === 'contact' ? 'contacts' : t === 'deal' ? 'deals' : 'tasks']
        .length > 0
  );

  return (
    <div className="relative w-full max-w-md">
      {/* Input row */}
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results && query.trim().length >= 2) setOpen(true);
          }}
          placeholder="Search contacts, deals, tasks..."
          aria-label="Global search"
          className={cn(
            'h-9 w-full rounded-md border border-input bg-background/60 pl-9 pr-16 text-sm text-foreground placeholder:text-muted-foreground',
            'transition-[border-color,box-shadow] outline-none',
            'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
            'dark:bg-input/30'
          )}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading && (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          )}
          {query.length > 0 && !loading && (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center justify-center size-5 rounded text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
          {query.length === 0 && (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground select-none">
              <span className="text-[11px]">⌘</span>K
            </kbd>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {open && (
        <div
          ref={dropdownRef}
          role="listbox"
          aria-label="Search results"
          className={cn(
            'absolute top-full left-0 z-50 mt-1.5 w-full min-w-[280px]',
            'rounded-lg border border-border bg-popover shadow-lg',
            'overflow-hidden'
          )}
        >
          {!hasResults ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="py-1">
              {types.map((type) => {
                const { label, Icon } = GROUP_META[type];
                const groupItems = flat.filter((i) => i.type === type);

                return (
                  <div key={type}>
                    {/* Group header */}
                    <div className="flex items-center gap-1.5 px-3 pt-2 pb-1">
                      <Icon className="size-3 text-muted-foreground" />
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {label}
                      </span>
                    </div>

                    {/* Group rows */}
                    {groupItems.map((item) => {
                      const globalIdx = flat.indexOf(item);
                      const isActive = globalIdx === activeIndex;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="option"
                          aria-selected={isActive}
                          onMouseEnter={() => setActiveIndex(globalIdx)}
                          onClick={() => navigate(item)}
                          className={cn(
                            'w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                            isActive
                              ? 'bg-accent text-accent-foreground'
                              : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                          )}
                        >
                          <span className="truncate font-medium">
                            {item.label}
                          </span>
                          {item.sub && (
                            <span className="ml-auto shrink-0 text-xs text-muted-foreground truncate max-w-[120px]">
                              {item.sub}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}

              {/* Footer hint */}
              <div className="flex items-center gap-3 border-t border-border px-3 py-2 mt-1">
                <span className="text-[10px] text-muted-foreground">
                  <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px]">
                    ↑↓
                  </kbd>{' '}
                  navigate
                </span>
                <span className="text-[10px] text-muted-foreground">
                  <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px]">
                    Enter
                  </kbd>{' '}
                  go
                </span>
                <span className="text-[10px] text-muted-foreground">
                  <kbd className="rounded border border-border bg-muted px-1 py-0.5 text-[10px]">
                    Esc
                  </kbd>{' '}
                  close
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
