// ─────────────────────────────────────────────────────────────────────────────
// CSV Import / Export utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parsed CSV result -- array of rows, each row is a Record keyed by header name.
 */
export interface ParsedCSV {
  headers: string[];
  rows: Record<string, string>[];
}

/**
 * Parse a CSV string into structured data.
 * Handles quoted fields (including escaped quotes) and trims whitespace.
 */
export function parseCSV(csvText: string): ParsedCSV {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = (values[j] ?? '').trim();
    }
    rows.push(row);
  }

  return { headers, rows };
}

/**
 * Parse a single CSV line, respecting quoted fields with commas and escaped quotes.
 */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote ""
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }

  result.push(current);
  return result;
}

/**
 * Export data rows to a CSV string.
 *
 * @param headers - Column headers (also determines field order)
 * @param rows    - Array of objects to export
 */
export function exportCSV(
  headers: string[],
  rows: Record<string, string | number | boolean | null | undefined>[]
): string {
  const escapeCsvField = (value: string): string => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const headerLine = headers.map(escapeCsvField).join(',');

  const dataLines = rows.map((row) =>
    headers
      .map((h) => {
        const val = row[h];
        if (val == null) return '';
        return escapeCsvField(String(val));
      })
      .join(',')
  );

  return [headerLine, ...dataLines].join('\n');
}
