/**
 * Unit tests for src/lib/html-utils.ts escapeHtml() — used to neutralize
 * user-supplied values interpolated into email templates. Order matters:
 * '&' must be escaped first so we never double-escape.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml } from '../../src/lib/html-utils';

test('escapes all five HTML-significant characters', () => {
  assert.equal(
    escapeHtml(`<a href="x" onclick='y'>&`),
    '&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;',
  );
});

test("'&' is escaped first — no double escaping", () => {
  assert.equal(escapeHtml('<'), '&lt;'); // not &amp;lt;
  assert.equal(escapeHtml('a & b'), 'a &amp; b');
});

test('neutralizes a script-injection payload', () => {
  assert.equal(escapeHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
});

test('leaves safe unicode/text untouched', () => {
  assert.equal(escapeHtml('José 北京 100% done'), 'José 北京 100% done');
  assert.equal(escapeHtml(''), '');
});
