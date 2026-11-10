/**
 * Unit tests for src/lib/email-templates.ts — the transactional email builders.
 * They interpolate user-controlled values (names, form/deal titles, emails) into
 * HTML, so every builder must HTML-escape its inputs. A regression here is a
 * stored-XSS vector delivered straight to a user's inbox.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  welcomeEmail,
  formSubmissionAlert,
  taskDueReminder,
  dealStageChange,
} from '../../src/lib/email-templates';

const XSS = '<script>alert(1)</script>';

test('welcomeEmail escapes HTML in the user name', () => {
  const { htmlBody, subject } = welcomeEmail(`${XSS}Bob`);
  assert.ok(!htmlBody.includes(XSS), 'raw script tag must not survive');
  assert.ok(htmlBody.includes('&lt;script&gt;'));
  assert.ok(subject.length > 0);
});

test('formSubmissionAlert escapes form name, contact name, and email', () => {
  const { htmlBody } = formSubmissionAlert('<b>Form</b>', '<i>Jane</i>', 'a"b@example.com');
  assert.ok(!htmlBody.includes('<b>Form</b>'));
  assert.ok(!htmlBody.includes('<i>Jane</i>'));
  assert.ok(htmlBody.includes('&lt;b&gt;Form&lt;/b&gt;'));
  assert.ok(htmlBody.includes('&quot;'), 'quote in email should be escaped');
});

test('taskDueReminder and dealStageChange escape their inputs', () => {
  assert.ok(!taskDueReminder(XSS, XSS).htmlBody.includes(XSS));
  assert.ok(!dealStageChange(XSS, XSS).htmlBody.includes(XSS));
});

test('safe input is rendered verbatim in the body', () => {
  const { htmlBody, textBody } = welcomeEmail('Bob Smith');
  assert.ok(htmlBody.includes('Bob Smith'));
  assert.ok(typeof textBody === 'string');
});
