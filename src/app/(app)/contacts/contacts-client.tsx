'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ContactForm,
  STATUS_LABELS,
  STATUS_BADGE_CLASS,
} from '@/components/contacts/contact-form';
import {
  createContact,
  bulkCreateContacts,
  exportContacts,
  bulkUpdateStatus,
  bulkDeleteContacts,
} from './actions';
import type { CsvContactRow, ExportContactRow } from './actions';
import { ContactStatus } from '@/generated/prisma/enums';

interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: ContactStatus;
  createdAt: string;
}

interface Props {
  contacts: Contact[];
  total: number;
  page: number;
  pageSize: number;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV parsing (no external libs)
// ─────────────────────────────────────────────────────────────────────────────

// Recognised column header synonyms keyed to our canonical field names
const HEADER_MAP: Record<string, keyof CsvContactRow> = {
  name: 'name',
  'full name': 'name',
  fullname: 'name',
  'first name': 'name',
  firstname: 'name',
  email: 'email',
  'email address': 'email',
  phone: 'phone',
  'phone number': 'phone',
  mobile: 'phone',
  company: 'company',
  organization: 'company',
  organisation: 'company',
  status: 'status',
};

interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

/**
 * Splits one CSV line respecting double-quoted fields that may contain commas
 * or escaped quotes (""). No external libs.
 */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        // Escaped quote inside a quoted field
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }

  fields.push(current.trim());
  return fields;
}

function parseCsv(text: string): ParsedCsv {
  // Normalise line endings
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim() !== '');

  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = splitCsvLine(lines[0]).map((h) =>
    h.replace(/^"|"$/g, '').toLowerCase().trim()
  );

  const rows = lines.slice(1).map((line) =>
    splitCsvLine(line).map((cell) => cell.replace(/^"|"$/g, '').trim())
  );

  return { headers, rows };
}

function csvRowsToCsvContactRows(parsed: ParsedCsv): CsvContactRow[] {
  return parsed.rows.map((row) => {
    const obj: Partial<CsvContactRow> = {};

    parsed.headers.forEach((header, idx) => {
      const field = HEADER_MAP[header];
      if (field) {
        const val = row[idx] ?? '';
        if (val !== '') {
          (obj as Record<string, string>)[field] = val;
        }
      }
    });

    return obj as CsvContactRow;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Column mapping types
// ─────────────────────────────────────────────────────────────────────────────

type MappableField = keyof CsvContactRow | 'ignore';

const FIELD_OPTIONS: { value: MappableField; label: string }[] = [
  { value: 'ignore', label: '-- Ignore --' },
  { value: 'name', label: 'Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'company', label: 'Company' },
  { value: 'status', label: 'Status' },
];

// ─────────────────────────────────────────────────────────────────────────────
// CSV Import dialog
// ─────────────────────────────────────────────────────────────────────────────

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

function CsvImportDialog({ open, onOpenChange, onImported }: ImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<Record<string, MappableField>>({});
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState('');
  const [importing, setImporting] = useState(false);

  function reset() {
    setParsed(null);
    setMapping({});
    setFileName('');
    setFileError('');
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleClose(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError('');
    setParsed(null);

    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setFileError('Only .csv files are accepted.');
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const result = parseCsv(text);

      if (result.headers.length === 0) {
        setFileError('The file appears to be empty or has no header row.');
        return;
      }

      if (result.rows.length === 0) {
        setFileError('The file has a header row but no data rows.');
        return;
      }

      if (result.rows.length > 500) {
        setFileError(
          `This file has ${result.rows.length} rows. Maximum is 500 per import. Please split your file.`
        );
        return;
      }

      // Auto-map columns using HEADER_MAP
      const autoMapping: Record<string, MappableField> = {};
      result.headers.forEach((h) => {
        autoMapping[h] = HEADER_MAP[h] ?? 'ignore';
      });
      setMapping(autoMapping);
      setParsed(result);
    };
    reader.readAsText(file);
  }

  function handleMappingChange(header: string, field: MappableField) {
    setMapping((prev) => ({ ...prev, [header]: field }));
  }

  // Build preview rows using the current column mapping
  function buildPreviewRows(): CsvContactRow[] {
    if (!parsed) return [];
    return parsed.rows.slice(0, 5).map((row) => {
      const obj: Partial<CsvContactRow> = {};
      parsed.headers.forEach((header, idx) => {
        const field = mapping[header];
        if (field && field !== 'ignore') {
          const val = row[idx] ?? '';
          if (val !== '') {
            (obj as Record<string, string>)[field] = val;
          }
        }
      });
      return obj as CsvContactRow;
    });
  }

  async function handleImport() {
    if (!parsed) return;

    // Validate that "name" is mapped
    const nameIsMapped = Object.values(mapping).includes('name');
    if (!nameIsMapped) {
      toast.error('You must map at least one column to "Name".');
      return;
    }

    // Build full contact rows from the parsed CSV using current mapping
    const contactRows: CsvContactRow[] = parsed.rows.map((row) => {
      const obj: Partial<CsvContactRow> = {};
      parsed.headers.forEach((header, idx) => {
        const field = mapping[header];
        if (field && field !== 'ignore') {
          const val = row[idx] ?? '';
          if (val !== '') {
            (obj as Record<string, string>)[field] = val;
          }
        }
      });
      return obj as CsvContactRow;
    });

    setImporting(true);
    const result = await bulkCreateContacts(contactRows);
    setImporting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    const { imported, skipped, errors } = result.data;

    if (imported > 0) {
      toast.success(
        `${imported} contact${imported !== 1 ? 's' : ''} imported${skipped > 0 ? `, ${skipped} skipped (duplicate email)` : ''}.`
      );
    } else if (skipped > 0) {
      toast.info(`All ${skipped} contacts were skipped (duplicate emails).`);
    } else {
      toast.warning('No contacts were imported.');
    }

    if (errors.length > 0) {
      // Show first few row errors as individual toasts
      errors.slice(0, 3).forEach((e) => toast.error(e));
      if (errors.length > 3) {
        toast.error(`...and ${errors.length - 3} more row error(s).`);
      }
    }

    handleClose(false);
    onImported();
  }

  const previewRows = buildPreviewRows();
  const previewFields: (keyof CsvContactRow)[] = ['name', 'email', 'phone', 'company', 'status'];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Contacts from CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* File picker */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Select CSV file
            </label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose file
              </Button>
              <span className="text-sm text-muted-foreground">
                {fileName || 'No file chosen'}
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFile}
            />
            {fileError && (
              <p className="text-sm text-red-400 mt-1.5">{fileError}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1.5">
              Accepts .csv files only. Max 500 rows per import.
            </p>
          </div>

          {parsed && (
            <>
              {/* Column mapping */}
              <div>
                <p className="text-sm font-medium text-foreground mb-2">
                  Map columns &mdash; {parsed.rows.length} row
                  {parsed.rows.length !== 1 ? 's' : ''} detected
                </p>
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-1/2">CSV Column</TableHead>
                        <TableHead>Maps to</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsed.headers.map((header) => (
                        <TableRow key={header}>
                          <TableCell className="font-mono text-sm text-muted-foreground">
                            {header}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={mapping[header] ?? 'ignore'}
                              onValueChange={(v) =>
                                handleMappingChange(header, v as MappableField)
                              }
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {FIELD_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Preview */}
              <div>
                <p className="text-sm font-medium text-foreground mb-2">
                  Preview (first {previewRows.length} row{previewRows.length !== 1 ? 's' : ''})
                </p>
                <div className="rounded-lg border border-border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {previewFields.map((f) => (
                          <TableHead key={f} className="capitalize">
                            {f}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.map((row, i) => (
                        <TableRow key={i}>
                          {previewFields.map((f) => (
                            <TableCell
                              key={f}
                              className="text-sm text-muted-foreground max-w-[160px] truncate"
                            >
                              {row[f] ?? (
                                <span className="text-zinc-600 italic">--</span>
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-1">
                <Button
                  variant="outline"
                  onClick={() => handleClose(false)}
                  disabled={importing}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-[#D4A017] text-black hover:bg-[#D4A017]/90 font-semibold"
                  onClick={handleImport}
                  disabled={importing}
                >
                  {importing
                    ? 'Importing...'
                    : `Import ${parsed.rows.length} contact${parsed.rows.length !== 1 ? 's' : ''}`}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV export helpers
// ─────────────────────────────────────────────────────────────────────────────

function escapeCsvField(value: string | null): string {
  const str = value ?? '';
  // Quote any field that contains a comma, double-quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(rows: ExportContactRow[]): string {
  const header = ['Name', 'Email', 'Phone', 'Company', 'Status', 'Source', 'Created'].join(',');

  const body = rows.map((r) => {
    const created = new Date(r.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return [
      escapeCsvField(r.name),
      escapeCsvField(r.email),
      escapeCsvField(r.phone),
      escapeCsvField(r.company),
      escapeCsvField(r.status),
      escapeCsvField(r.source),
      escapeCsvField(created),
    ].join(',');
  });

  return [header, ...body].join('\r\n');
}

function triggerCsvDownload(csv: string): void {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const filename = `contacts-${yyyy}-${mm}-${dd}.csv`;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main client component
// ─────────────────────────────────────────────────────────────────────────────

export function ContactsClient({ contacts, total, page, pageSize }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  // ── Multi-select state ─────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [bulkWorking, setBulkWorking] = useState(false);

  const allPageIds = contacts.map((c) => c.id);
  const allSelected =
    allPageIds.length > 0 && allPageIds.every((id) => selectedIds.has(id));
  const someSelected = allPageIds.some((id) => selectedIds.has(id)) && !allSelected;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allPageIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allPageIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }

  function toggleSelectOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function handleBulkStatusChange(status: string) {
    const ids = Array.from(selectedIds);
    setBulkWorking(true);
    const result = await bulkUpdateStatus(ids, status);
    setBulkWorking(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    const { updated } = result.data;
    toast.success(
      `${updated} contact${updated !== 1 ? 's' : ''} updated to "${STATUS_LABELS[status as ContactStatus] ?? status}".`
    );
    clearSelection();
    router.refresh();
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    setBulkWorking(true);
    const result = await bulkDeleteContacts(ids);
    setBulkWorking(false);
    setConfirmDeleteOpen(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    const { deleted } = result.data;
    toast.success(
      `${deleted} contact${deleted !== 1 ? 's' : ''} deleted.`
    );
    clearSelection();
    router.refresh();
  }

  // Controlled input value mirrors the URL param so the field stays in sync
  // on page navigation but doesn't lag waiting for the server round-trip.
  const [searchInput, setSearchInput] = useState(
    searchParams.get('search') ?? ''
  );

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buildUrl = useCallback(
    (overrides: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(overrides)) {
        if (value === undefined || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }

      // Reset to page 1 whenever search or status changes
      if ('search' in overrides || 'status' in overrides) {
        params.delete('page');
      }

      const qs = params.toString();
      return `/contacts${qs ? `?${qs}` : ''}`;
    },
    [searchParams]
  );

  // Debounced search: update URL 300 ms after the user stops typing
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      router.push(buildUrl({ search: searchInput }));
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput, buildUrl, router]);

  async function handleExport() {
    setExporting(true);
    try {
      const result = await exportContacts();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      if (result.data.length === 0) {
        toast.info('No contacts to export.');
        return;
      }
      const csv = buildCsv(result.data);
      triggerCsvDownload(csv);
      toast.success(`${result.data.length} contact${result.data.length !== 1 ? 's' : ''} exported.`);
    } finally {
      setExporting(false);
    }
  }

  function handleStatusChange(value: string) {
    router.push(buildUrl({ status: value === 'all' ? undefined : value }));
  }

  function handlePageChange(next: number) {
    router.push(buildUrl({ page: next > 1 ? String(next) : undefined }));
  }

  function handleImported() {
    // Refresh server data by navigating to current URL
    router.refresh();
  }

  const totalPages = Math.ceil(total / pageSize);
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  const currentStatus = searchParams.get('status') ?? 'all';
  const hasFilters =
    (searchParams.get('search') ?? '') !== '' || currentStatus !== 'all';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-y-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contacts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {total} total contact{total !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={exporting || total === 0}
            className="font-medium"
          >
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>

          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            className="font-medium"
          >
            Import CSV
          </Button>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#D4A017] text-black hover:bg-[#D4A017]/90 font-semibold">
                + Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Contact</DialogTitle>
              </DialogHeader>
              <ContactForm
                onSubmit={createContact}
                onSuccess={() => setDialogOpen(false)}
                submitLabel="Create Contact"
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <CsvImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={handleImported}
      />

      {/* ── Bulk actions bar ─────────────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="sticky top-16 z-20 flex items-center gap-3 flex-wrap rounded-lg border border-[#D4A017]/50 bg-zinc-950 px-4 py-2.5 shadow-lg">
          <span className="text-sm font-semibold text-[#D4A017] shrink-0">
            {selectedIds.size} selected
          </span>

          <div className="h-4 w-px bg-border shrink-0" />

          <Select
            value=""
            onValueChange={(value) => {
              if (value) handleBulkStatusChange(value);
            }}
            disabled={bulkWorking}
          >
            <SelectTrigger className="h-8 w-44 text-sm border-[#D4A017]/40 bg-zinc-950 text-foreground focus:ring-[#D4A017]/40">
              <SelectValue placeholder="Change Status..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            size="sm"
            variant="outline"
            className="h-8 border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            disabled={bulkWorking}
            onClick={() => setConfirmDeleteOpen(true)}
          >
            Delete {selectedIds.size > 1 ? `${selectedIds.size} contacts` : 'contact'}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-muted-foreground hover:text-foreground ml-auto"
            disabled={bulkWorking}
            onClick={clearSelection}
          >
            Clear selection
          </Button>
        </div>
      )}

      {/* ── Bulk delete confirmation dialog ──────────────────────────────── */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {selectedIds.size} contact{selectedIds.size !== 1 ? 's' : ''}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will soft-delete {selectedIds.size === 1 ? 'this contact' : `all ${selectedIds.size} selected contacts`}.
            They will no longer appear in your list.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDeleteOpen(false)}
              disabled={bulkWorking}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700 font-semibold"
              onClick={handleBulkDelete}
              disabled={bulkWorking}
            >
              {bulkWorking ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex gap-3 flex-wrap">
        <Input
          placeholder="Search by name, email, or company..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-sm"
        />
        <Select value={currentStatus} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {/* Select-all checkbox */}
              <TableHead className="w-10 pr-0">
                <input
                  type="checkbox"
                  aria-label="Select all contacts on this page"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-border accent-[#D4A017] cursor-pointer"
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="p-0">
                  {hasFilters ? (
                    <div className="text-center py-10 text-muted-foreground">
                      No contacts match your filters.
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
                      <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-2xl border border-border bg-muted/40">
                        <Users className="w-8 h-8 text-muted-foreground" strokeWidth={1.5} />
                      </div>
                      <h3 className="font-semibold text-xl mb-2">
                        No contacts yet
                      </h3>
                      <p className="text-muted-foreground max-w-md mb-6 leading-relaxed">
                        Add a contact manually, import from a CSV, or hook up a
                        lead form and let submissions flow in automatically.
                      </p>
                      <div className="flex flex-col sm:flex-row items-center gap-3">
                        <Link
                          href="/forms"
                          className="inline-flex items-center justify-center rounded-lg bg-[#D4A017] text-[#0A0A0F] font-semibold px-5 py-2.5 hover:brightness-110 transition-[filter]"
                        >
                          Set up a lead form
                        </Link>
                        <span className="text-sm text-muted-foreground">
                          or use the <span className="text-foreground">+ New contact</span> button above
                        </span>
                      </div>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => {
                const isSelected = selectedIds.has(contact.id);
                return (
                  <TableRow
                    key={contact.id}
                    className={`cursor-pointer hover:bg-muted/50 transition-colors ${isSelected ? 'bg-[#D4A017]/8' : ''}`}
                    onClick={() => router.push(`/contacts/${contact.id}`)}
                  >
                    {/* Per-row checkbox: stop propagation so clicking it doesn't open contact */}
                    <TableCell
                      className="w-10 pr-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectOne(contact.id);
                      }}
                    >
                      <input
                        type="checkbox"
                        aria-label={`Select ${contact.name}`}
                        checked={isSelected}
                        onChange={() => toggleSelectOne(contact.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-border accent-[#D4A017] cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {contact.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {contact.email ?? '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {contact.phone ?? '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {contact.company ?? '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={STATUS_BADGE_CLASS[contact.status]}
                      >
                        {STATUS_LABELS[contact.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(contact.createdAt)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {total > 0 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-sm text-muted-foreground">
            Showing {rangeStart}-{rangeEnd} of {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => handlePageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
