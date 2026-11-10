'use client';

import { useState, useRef, useEffect, useId } from 'react';
import { X, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

export interface ContactOption {
  id: string;
  name: string;
  email: string;
}

interface ContactPickerProps {
  value?: string;
  onChange: (contactId: string | null) => void;
  contacts: ContactOption[];
  label?: string;
  required?: boolean;
  placeholder?: string;
}

export function ContactPicker({
  value,
  onChange,
  contacts,
  label,
  required = false,
  placeholder = 'Search contacts...',
}: ContactPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  // Panel width is measured from the container when opening (in the click
  // handler, not during render) so the dropdown matches the trigger width.
  const [panelWidth, setPanelWidth] = useState<number>();
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const selected = contacts.find((c) => c.id === value) ?? null;

  const filtered = query.trim()
    ? contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.email.toLowerCase().includes(query.toLowerCase())
      )
    : contacts;

  // Close on outside click
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open) {
      // Slight delay lets the DOM paint first
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  function handleSelect(contact: ContactOption) {
    onChange(contact.id);
    setOpen(false);
    setQuery('');
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
    setQuery('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  }

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef} onKeyDown={handleKeyDown}>
      {label && (
        <Label htmlFor={inputId} className="text-zinc-300">
          {label}
          {required && <span className="ml-1 text-red-400">*</span>}
        </Label>
      )}

      {/* Trigger button */}
      <button
        id={inputId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (!open && containerRef.current) setPanelWidth(containerRef.current.offsetWidth);
          setOpen((prev) => !prev);
        }}
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-md border px-3 py-1 text-sm transition-colors',
          'border-zinc-700 bg-zinc-800 text-white',
          'hover:border-zinc-600',
          open && 'border-[#D4A017] ring-2 ring-[#D4A017]/20',
          !selected && 'text-zinc-500'
        )}
      >
        <span className="truncate">
          {selected ? (
            <span className="flex items-center gap-2">
              <span className="font-medium text-white">{selected.name}</span>
              <span className="text-zinc-400">{selected.email}</span>
            </span>
          ) : (
            placeholder
          )}
        </span>

        <span className="ml-2 flex shrink-0 items-center gap-1">
          {selected && (
            <span
              role="button"
              aria-label="Clear selection"
              onClick={handleClear}
              className="rounded p-0.5 text-zinc-400 hover:text-white"
            >
              <X className="size-3.5" />
            </span>
          )}
          <ChevronDown
            className={cn(
              'size-4 text-zinc-400 transition-transform duration-150',
              open && 'rotate-180'
            )}
          />
        </span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          role="listbox"
          aria-label="Contact list"
          className={cn(
            'absolute z-50 mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 shadow-lg',
            'max-h-64 overflow-hidden'
          )}
          style={{ width: panelWidth }}
        >
          {/* Search bar */}
          <div className="border-b border-zinc-700 p-2">
            <div className="flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-800 px-2">
              <Search className="size-3.5 shrink-0 text-zinc-500" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type to filter..."
                className="h-8 w-full bg-transparent text-sm text-white placeholder:text-zinc-500 outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="shrink-0 text-zinc-500 hover:text-white"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Contact list */}
          <ul className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-zinc-500">
                No contacts found
              </li>
            ) : (
              filtered.map((contact) => (
                <li
                  key={contact.id}
                  role="option"
                  aria-selected={contact.id === value}
                  onClick={() => handleSelect(contact)}
                  className={cn(
                    'flex cursor-pointer flex-col gap-0.5 px-3 py-2 text-sm transition-colors',
                    'hover:bg-zinc-800',
                    contact.id === value && 'bg-zinc-800'
                  )}
                >
                  <span className="font-medium text-white">{contact.name}</span>
                  <span className="text-xs text-zinc-400">{contact.email}</span>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
