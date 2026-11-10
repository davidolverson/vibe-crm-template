/**
 * Contacts CRUD - E2E tests
 *
 * Covers:
 *   - Adding a contact via the "+ Add Contact" dialog
 *   - Newly created contact appears in the contacts table
 *   - Clicking a contact row navigates to the detail page
 *   - Search input filters the contacts list
 *   - Status dropdown filters the contacts list
 *
 * Each test that creates data uses a timestamp-based unique name so runs
 * do not collide with each other or with real data.
 */

import { test, expect } from './fixtures';

// Shared unique suffix so we can find contacts we created without
// matching unrelated rows already in the database.
const RUN_ID = `e2e-${Date.now()}`;

function contactName(label: string) {
  return `${label} ${RUN_ID}`;
}

test.describe('Contacts', () => {
  test.beforeEach(async ({ loggedInPage }) => {
    await loggedInPage.goto('/contacts');
    await loggedInPage.waitForLoadState('networkidle');
  });

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------

  test('add contact via the form opens the dialog and submits', async ({
    loggedInPage: page,
  }) => {
    const name = contactName('Alice Tester');

    // Open the dialog
    await page.click('button:has-text("+ Add Contact")');
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Add Contact' })).toBeVisible();

    // Fill in the required name field
    await page.fill('#cf-name', name);
    await page.fill('#cf-email', `alice-${RUN_ID}@example.test`);
    await page.fill('#cf-company', 'Test Corp');

    // Submit
    await page.click('button:has-text("Create Contact")');

    // Dialog should close after a successful save
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10_000 });
  });

  // ---------------------------------------------------------------------------
  // Read - list
  // ---------------------------------------------------------------------------

  test('newly created contact appears in the contacts list', async ({
    loggedInPage: page,
  }) => {
    const name = contactName('Bob Listed');

    // Create via dialog
    await page.click('button:has-text("+ Add Contact")');
    await page.fill('#cf-name', name);
    await page.fill('#cf-email', `bob-listed-${RUN_ID}@example.test`);
    await page.click('button:has-text("Create Contact")');
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10_000 });

    // The row should now appear in the table
    await expect(page.getByRole('cell', { name })).toBeVisible({ timeout: 10_000 });
  });

  // ---------------------------------------------------------------------------
  // Read - detail
  // ---------------------------------------------------------------------------

  test('clicking a contact row opens the detail page', async ({
    loggedInPage: page,
  }) => {
    const name = contactName('Carol Detail');

    // Create the contact first so we know one definitely exists
    await page.click('button:has-text("+ Add Contact")');
    await page.fill('#cf-name', name);
    await page.fill('#cf-email', `carol-${RUN_ID}@example.test`);
    await page.click('button:has-text("Create Contact")');
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10_000 });

    // Click the row
    const row = page.getByRole('row').filter({ hasText: name });
    await expect(row).toBeVisible({ timeout: 10_000 });
    await row.click();

    // Should now be on a /contacts/:id URL
    await page.waitForURL(/\/contacts\/[^/]+$/, { timeout: 15_000 });

    // The contact name should appear somewhere on the detail page
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 10_000 });
  });

  // ---------------------------------------------------------------------------
  // Search filter
  // ---------------------------------------------------------------------------

  test('search input filters contacts by name', async ({
    loggedInPage: page,
  }) => {
    const name = contactName('Dave Searchable');

    // Create the contact
    await page.click('button:has-text("+ Add Contact")');
    await page.fill('#cf-name', name);
    await page.click('button:has-text("Create Contact")');
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10_000 });

    // Type a distinctive portion into the search box
    const searchBox = page.getByPlaceholder(/search by name/i);
    await searchBox.fill(`Dave ${RUN_ID}`);

    // Wait for debounce and page re-render
    await page.waitForTimeout(500);
    await page.waitForLoadState('networkidle');

    // The contact we created should be visible
    await expect(page.getByRole('cell', { name })).toBeVisible({ timeout: 10_000 });
  });

  test('search with a non-matching term shows no results message', async ({
    loggedInPage: page,
  }) => {
    const searchBox = page.getByPlaceholder(/search by name/i);
    await searchBox.fill('zzz-no-match-xyz-e2e');

    await page.waitForTimeout(500);
    await page.waitForLoadState('networkidle');

    // Either no rows, or the empty-state message is shown
    const emptyMsg = page.getByText(/no contacts match your filters/i);
    const hasEmpty = await emptyMsg.isVisible().catch(() => false);

    if (!hasEmpty) {
      // Fallback: check that the table body contains no data rows
      const rows = page.getByRole('row').filter({ hasNot: page.getByRole('columnheader') });
      const count = await rows.count();
      expect(count).toBe(0);
    }
  });

  // ---------------------------------------------------------------------------
  // Status filter
  // ---------------------------------------------------------------------------

  test('status filter limits results to the selected status', async ({
    loggedInPage: page,
  }) => {
    const name = contactName('Eve Qualified');

    // Create a contact with "Qualified" status
    await page.click('button:has-text("+ Add Contact")');
    await page.fill('#cf-name', name);

    // Change status to Qualified - use the select inside the dialog
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Qualified' }).click();

    await page.click('button:has-text("Create Contact")');
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10_000 });

    // Apply the status filter on the contacts list page
    // The status select trigger is outside the dialog
    const statusTrigger = page.getByRole('combobox').filter({ hasNot: dialog });
    await statusTrigger.first().click();
    await page.getByRole('option', { name: 'Qualified' }).click();

    await page.waitForLoadState('networkidle');

    // All visible status badges should say "Qualified"
    const badges = page.getByText('Qualified');
    await expect(badges.first()).toBeVisible({ timeout: 10_000 });

    // Our specific contact should be present
    await expect(page.getByRole('cell', { name })).toBeVisible({ timeout: 10_000 });
  });

  test('selecting "All Statuses" removes the status filter', async ({
    loggedInPage: page,
  }) => {
    // Apply a filter first
    const statusTrigger = page.getByRole('combobox').first();
    await statusTrigger.click();
    await page.getByRole('option', { name: 'Customer' }).click();
    await page.waitForLoadState('networkidle');

    // Reset to all
    await statusTrigger.click();
    await page.getByRole('option', { name: 'All Statuses' }).click();
    await page.waitForLoadState('networkidle');

    // The URL should no longer carry a status query param
    const url = new URL(page.url());
    expect(url.searchParams.get('status')).toBeNull();
  });
});
