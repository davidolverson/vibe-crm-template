/**
 * E2E tests: Authentication flow for VIBE.
 *
 * Every test creates its own isolated user so tests can run in any order
 * without shared state. Cleanup removes all DB rows after each test.
 *
 * Covered scenarios:
 *   1. Sign-up page renders correctly
 *   2. Sign-up creates account and redirects to /onboarding
 *   3. Onboarding creates workspace and redirects to /dashboard
 *   4. Sign-in with valid credentials redirects to /dashboard
 *   5. Sign-in with wrong password shows an error
 *   6. Unauthenticated access to /dashboard redirects to /sign-in
 *   7. Sign-out clears session and redirects to /sign-in
 */

import { test, expect } from '@playwright/test';
import {
  createTestUser,
  signUpAndOnboard,
  signInAs,
  cleanupTestUser,
} from './helpers';

// ---------------------------------------------------------------------------
// 1. Sign-up page renders correctly
// ---------------------------------------------------------------------------

test('sign-up page loads with correct fields and heading', async ({ page }) => {
  await page.goto('/sign-up');

  // Heading
  await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();

  // All three form fields present
  await expect(page.locator('#name')).toBeVisible();
  await expect(page.locator('#email')).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();

  // Submit button
  await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();

  // Link to sign-in
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
});

// ---------------------------------------------------------------------------
// 2. Sign-up creates account and redirects to /onboarding
// ---------------------------------------------------------------------------

test('sign-up with valid data redirects to /onboarding', async ({ page }) => {
  const user = createTestUser();

  try {
    await page.goto('/sign-up');

    await page.fill('#name', user.name);
    await page.fill('#email', user.email);
    await page.fill('#password', user.password);

    await page.click('button[type="submit"]');

    // Should land on onboarding, not dashboard yet
    await page.waitForURL('**/onboarding**', { timeout: 20_000 });
    await expect(page).toHaveURL(/\/onboarding/);

    // Onboarding page should prompt for workspace name
    await expect(
      page.getByRole('heading', { name: 'Set Up Your Workspace' }),
    ).toBeVisible();
  } finally {
    await cleanupTestUser(user.email);
  }
});

// ---------------------------------------------------------------------------
// 3. Onboarding creates workspace and redirects to /dashboard
// ---------------------------------------------------------------------------

test('onboarding creates workspace and redirects to /dashboard', async ({ page }) => {
  const user = createTestUser();

  try {
    // Sign up first
    await page.goto('/sign-up');
    await page.fill('#name', user.name);
    await page.fill('#email', user.email);
    await page.fill('#password', user.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/onboarding**', { timeout: 20_000 });

    // Complete onboarding
    await page.fill('#org-name', user.orgName);
    await page.click('button[type="submit"]');

    // Should land on /dashboard
    await page.waitForURL('**/dashboard**', { timeout: 20_000 });
    await expect(page).toHaveURL(/\/dashboard/);
  } finally {
    await cleanupTestUser(user.email);
  }
});

// ---------------------------------------------------------------------------
// 4. Sign-in with valid credentials redirects to /dashboard
// ---------------------------------------------------------------------------

test('sign-in with valid credentials redirects to /dashboard', async ({ page }) => {
  const user = createTestUser();

  try {
    // Create the user first via full signup flow
    await signUpAndOnboard(page, user);

    // Sign out by clearing cookies so we start fresh
    await page.context().clearCookies();

    // Now sign back in
    await signInAs(page, user.email, user.password);

    await expect(page).toHaveURL(/\/dashboard/);
  } finally {
    await cleanupTestUser(user.email);
  }
});

// ---------------------------------------------------------------------------
// 5. Sign-in with wrong password shows error
// ---------------------------------------------------------------------------

test('sign-in with wrong password shows error message', async ({ page }) => {
  const user = createTestUser();

  try {
    // Create account
    await signUpAndOnboard(page, user);
    await page.context().clearCookies();

    // Attempt sign-in with wrong password
    await page.goto('/sign-in');
    await page.fill('#email', user.email);
    await page.fill('#password', 'WrongPassword999!');
    await page.click('button[type="submit"]');

    // Should stay on sign-in (not redirect to dashboard)
    // Sonner renders toasts in [data-sonner-toast] or similar -- wait briefly
    // then assert no navigation occurred
    await page.waitForTimeout(2_000);
    await expect(page).not.toHaveURL(/\/dashboard/);

    // An error toast or inline message should appear
    // Sonner appends toasts to the body -- check for any visible error indicator
    const hasToast = await page
      .locator('[data-sonner-toast]')
      .first()
      .isVisible()
      .catch(() => false);

    const hasErrorText = await page
      .getByText(/invalid|incorrect|failed|wrong/i)
      .first()
      .isVisible()
      .catch(() => false);

    // At least one error signal must be present
    expect(hasToast || hasErrorText).toBe(true);
  } finally {
    await cleanupTestUser(user.email);
  }
});

// ---------------------------------------------------------------------------
// 6. Unauthenticated user is redirected to /sign-in from /dashboard
// ---------------------------------------------------------------------------

test('unauthenticated access to /dashboard redirects to /sign-in', async ({
  page,
}) => {
  // Ensure no session cookies exist
  await page.context().clearCookies();

  await page.goto('/dashboard');

  // Middleware should redirect to /sign-in
  await page.waitForURL('**/sign-in**', { timeout: 10_000 });
  await expect(page).toHaveURL(/\/sign-in/);

  // Optionally the redirect param should be present
  const url = new URL(page.url());
  const redirect = url.searchParams.get('redirect');
  expect(redirect).toBe('/dashboard');
});

// ---------------------------------------------------------------------------
// 7. Sign-out clears session and redirects away from protected routes
// ---------------------------------------------------------------------------

test('sign-out clears session and redirects to sign-in or home', async ({
  page,
}) => {
  const user = createTestUser();

  try {
    // Full signup flow
    await signUpAndOnboard(page, user);

    // Confirm we are on dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Find and click the sign-out trigger.
    // The app uses a dropdown in the sidebar -- open it then click sign out.
    // We target any button/link whose visible text is "Sign out" (case-insensitive).
    const signOutButton = page.getByRole('button', { name: /sign out/i });
    const signOutLink = page.getByRole('link', { name: /sign out/i });

    // Try button first, fall back to link
    const trigger = (await signOutButton.isVisible().catch(() => false))
      ? signOutButton
      : signOutLink;

    // If the sign-out control is nested inside a dropdown, open it first.
    // Look for a user avatar or settings trigger in the sidebar.
    if (!(await trigger.isVisible().catch(() => false))) {
      // Try opening a user menu / dropdown that contains sign-out
      const avatarTrigger = page
        .locator('[data-radix-collection-item], [aria-haspopup="menu"]')
        .first();
      if (await avatarTrigger.isVisible().catch(() => false)) {
        await avatarTrigger.click();
        await page.waitForTimeout(400);
      }
    }

    await trigger.click();

    // After sign-out, the user should end up on /sign-in or / (not /dashboard)
    await page.waitForURL(/sign-in|^\/$/, { timeout: 15_000 });
    await expect(page).not.toHaveURL(/\/dashboard/);

    // Verify cookies are cleared -- navigating to /dashboard should redirect
    await page.goto('/dashboard');
    await page.waitForURL('**/sign-in**', { timeout: 10_000 });
    await expect(page).toHaveURL(/\/sign-in/);
  } finally {
    await cleanupTestUser(user.email);
  }
});
