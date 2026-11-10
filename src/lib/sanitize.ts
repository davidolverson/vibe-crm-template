/**
 * Input sanitization utilities for server actions.
 * Strips dangerous HTML/script content while preserving
 * unicode, normal punctuation, apostrophes, and ampersands.
 */

// Matches HTML tags including self-closing, with optional attributes
const HTML_TAG_RE = /<\/?[a-zA-Z][^>]*\/?>/g;

// Matches control characters (C0 + C1) except tab, newline, carriage return
const CONTROL_CHAR_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g;

/**
 * Sanitize a single string value.
 *
 * - Strips all HTML tags
 * - Removes control characters (keeps tab, newline, CR)
 * - Trims leading/trailing whitespace
 *
 * Safe for: unicode, apostrophes (O'Brien), ampersands (AT&T),
 * normal punctuation, accented characters, CJK, emoji, etc.
 *
 * @example sanitizeString("<b>O'Brien</b> & AT&T") // "O'Brien & AT&T"
 */
export function sanitizeString(input: string): string {
  return input
    .replace(HTML_TAG_RE, "")
    .replace(CONTROL_CHAR_RE, "")
    .trim();
}

/**
 * Recursively sanitize all string values in an object.
 * Handles nested objects, arrays, and preserves non-string types.
 *
 * @example sanitizeObject({ name: "<script>alert(1)</script>John", age: 30 })
 *          // { name: "alert(1)John", age: 30 }
 */
export function sanitizeObject<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    return sanitizeString(obj) as unknown as T;
  }

  if (typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item: unknown) => sanitizeObject(item)) as unknown as T;
  }

  if (obj instanceof Date) {
    return obj;
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    sanitized[key] = sanitizeObject(value);
  }

  return sanitized as T;
}
