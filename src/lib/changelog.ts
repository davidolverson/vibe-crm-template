import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export type InlineToken =
  | { type: 'text'; value: string }
  | { type: 'strong'; value: string }
  | { type: 'link'; href: string; value: string }
  | { type: 'code'; value: string };

export type Block =
  | { type: 'p'; inlines: InlineToken[] }
  | { type: 'h3'; inlines: InlineToken[] }
  | { type: 'ul'; items: InlineToken[][] };

export type ChangelogEntry = {
  slug: string;
  date: string;
  title: string;
  blocks: Block[];
};

const LINK_STRONG_PATTERN = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|`[^`]+`)/;

/**
 * Tokenize one line of inline markdown-ish text into strong / link / code / text runs.
 * Only supports the subset we actually use in content_log.md.
 */
export function tokenizeInline(raw: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const parts = raw.split(LINK_STRONG_PATTERN);
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      tokens.push({ type: 'strong', value: part.slice(2, -2) });
      continue;
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      tokens.push({ type: 'code', value: part.slice(1, -1) });
      continue;
    }
    const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (linkMatch) {
      tokens.push({ type: 'link', value: linkMatch[1], href: linkMatch[2] });
      continue;
    }
    tokens.push({ type: 'text', value: part });
  }
  return tokens;
}

/** Parse the body of a single changelog entry (everything after the H2 line). */
function parseBlocks(body: string): Block[] {
  const lines = body.split(/\r?\n/);
  const blocks: Block[] = [];
  let paragraphBuffer: string[] = [];
  let listBuffer: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return;
    const joined = paragraphBuffer.join(' ').trim();
    if (joined) blocks.push({ type: 'p', inlines: tokenizeInline(joined) });
    paragraphBuffer = [];
  };

  const flushList = () => {
    if (listBuffer.length === 0) return;
    blocks.push({
      type: 'ul',
      items: listBuffer.map((item) => tokenizeInline(item)),
    });
    listBuffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line === '' || line === '---') {
      flushParagraph();
      flushList();
      continue;
    }

    if (line.startsWith('### ')) {
      flushParagraph();
      flushList();
      blocks.push({ type: 'h3', inlines: tokenizeInline(line.slice(4).trim()) });
      continue;
    }

    if (line.startsWith('- ')) {
      flushParagraph();
      listBuffer.push(line.slice(2).trim());
      continue;
    }

    flushList();
    paragraphBuffer.push(line);
  }

  flushParagraph();
  flushList();
  return blocks;
}

function parseTitle(raw: string): { date: string; title: string; slug: string } {
  // Format: "YYYY-MM-DD -- Title here" or "YYYY-MM-DD - Title here"
  const trimmed = raw.trim();
  const match = /^(\d{4}-\d{2}-\d{2})\s*[--\-]\s*(.+)$/.exec(trimmed);
  if (match) {
    const date = match[1];
    const title = match[2].trim();
    const slug = `${date}-${title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)}`;
    return { date, title, slug };
  }
  return {
    date: '',
    title: trimmed,
    slug: trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60),
  };
}

/** Load and parse content_log.md into a list of entries, newest first. */
export async function loadChangelog(): Promise<ChangelogEntry[]> {
  const path = join(process.cwd(), 'content_log.md');
  const raw = await readFile(path, 'utf8');

  // Split on '## ' at start of line (second-level headings start entries)
  // First chunk is the file preamble (# VIBE -- Build-in-Public Content Log + blank lines)
  const chunks = raw.split(/\r?\n## /);
  const entries: ChangelogEntry[] = [];

  for (let i = 1; i < chunks.length; i++) {
    const chunk = chunks[i];
    const newlineIndex = chunk.indexOf('\n');
    if (newlineIndex === -1) continue;
    const titleLine = chunk.slice(0, newlineIndex);
    const body = chunk.slice(newlineIndex + 1);

    const { date, title, slug } = parseTitle(titleLine);
    const blocks = parseBlocks(body);
    entries.push({ slug, date, title, blocks });
  }

  // content_log.md is already written newest-first, preserve that order.
  return entries;
}
