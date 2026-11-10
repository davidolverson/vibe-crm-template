import { test as base, type Page } from '@playwright/test';

const TEST_EMAIL = 'testuser-v2@vibecrm.test';
const TEST_PASSWORD = 'TestPass123!';

/**
 * Signs in through the UI and persists the browser storage state so it can
 * be reused across tests without hitting the login form on every test.
 */
async function signIn(page: Page): Promise<void> {
  await page.goto('/sign-in');
  await page.waitForLoadState('networkidle');

  await page.fill('#email', TEST_EMAIL);
  await page.fill('#password', TEST_PASSWORD);
  await page.click('button[type="submit"]');

  // Wait until the app redirects away from /sign-in
  await page.waitForURL((url) => !url.pathname.includes('sign-in'), {
    timeout: 20_000,
  });
}

/**
 * Extend the Playwright test with a `loggedInPage` fixture.
 *
 * The fixture signs in once per worker and reuses the session for every test
 * in that worker, which avoids redundant network round-trips to the auth
 * endpoint.
 */
export const test = base.extend<{ loggedInPage: Page }>({
  loggedInPage: async ({ page }, use) => {
    // Navigate and sign in if not already authenticated
    await page.goto('/dashboard');

    const currentUrl = page.url();
    const needsLogin =
      currentUrl.includes('sign-in') || currentUrl.includes('sign-up');

    if (needsLogin) {
      await signIn(page);
    }

    // eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright fixture `use`, not the React hook
    await use(page);
  },
});

export { expect } from '@playwright/test';
export { TEST_EMAIL, TEST_PASSWORD };
