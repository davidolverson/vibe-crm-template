/**
 * E2E test helpers for VIBE auth flows.
 *
 * Each test creates its own isolated user via the UI so tests never
 * depend on pre-seeded data. Cleanup happens via direct Neon SQL through
 * the pg client using DATABASE_URL from the environment.
 */

import { type Page } from '@playwright/test';
import { Pool } from 'pg';

// ---------------------------------------------------------------------------
// Email generation
// ---------------------------------------------------------------------------

/**
 * Generate a unique test email that is clearly synthetic.
 * Format: test<timestamp><random4>@vibecrm.test
 */
export function generateTestEmail(): string {
  const ts = Date.now();
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `test${ts}${rand}@vibecrm.test`;
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

export interface TestUser {
  name: string;
  email: string;
  password: string;
  orgName: string;
}

/**
 * Build a TestUser object with a unique email.
 * All other fields are deterministic so tests are easy to read.
 */
export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  return {
    name: 'Test User',
    email: generateTestEmail(),
    password: 'TestPass123!',
    orgName: 'Test Workspace',
    ...overrides,
  };
}

/**
 * Sign up a brand-new user through the UI, complete onboarding, and land on
 * /dashboard. Returns the user data that was used.
 *
 * This is the canonical "full signup" flow used by most tests.
 */
export async function signUpAndOnboard(page: Page, user: TestUser): Promise<void> {
  // 1. Navigate to sign-up
  await page.goto('/sign-up');
  await page.waitForURL('**/sign-up**');

  // 2. Fill sign-up form
  await page.fill('#name', user.name);
  await page.fill('#email', user.email);
  await page.fill('#password', user.password);

  // 3. Submit
  await page.click('button[type="submit"]');

  // 4. Should land on /onboarding
  await page.waitForURL('**/onboarding**', { timeout: 20_000 });

  // 5. Fill workspace name and submit
  await page.fill('#org-name', user.orgName);
  await page.click('button[type="submit"]');

  // 6. Should land on /dashboard
  await page.waitForURL('**/dashboard**', { timeout: 20_000 });
}

/**
 * Sign in an existing user through the UI and wait for /dashboard.
 */
export async function signInAs(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/sign-in');
  await page.waitForURL('**/sign-in**');

  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');

  await page.waitForURL('**/dashboard**', { timeout: 20_000 });
}

// ---------------------------------------------------------------------------
// Database cleanup
// ---------------------------------------------------------------------------

/**
 * Open a one-off pg connection using DATABASE_URL from the test environment.
 * Caller must call pool.end() when done.
 */
function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Make sure .env.local is present and loaded.',
    );
  }
  return new Pool({ connectionString, max: 2, idleTimeoutMillis: 5_000 });
}

/**
 * Delete all data associated with a test user from the database.
 *
 * Deletion order respects FK constraints:
 *   tenant rows -> organization members -> organization -> user
 *
 * Better Auth stores users in the "user" table. Organizations live in the
 * "organization" table. Tenant workspace data is linked via the "tenant"
 * table which has organizationId as its FK.
 */
export async function cleanupTestUser(email: string): Promise<void> {
  const pool = createPool();
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Resolve user id
      const userRes = await client.query<{ id: string }>(
        'SELECT id FROM "user" WHERE email = $1',
        [email],
      );
      if (userRes.rows.length === 0) {
        await client.query('ROLLBACK');
        return; // nothing to clean up
      }
      const userId = userRes.rows[0].id;

      // Find organizations owned by (or containing) this user
      const orgRes = await client.query<{ organization_id: string }>(
        `SELECT "organizationId" AS organization_id
         FROM member
         WHERE "userId" = $1`,
        [userId],
      );
      const orgIds = orgRes.rows.map((r) => r.organization_id);

      if (orgIds.length > 0) {
        // Delete tenant workspace data first (FK -> organization)
        await client.query(
          `DELETE FROM "tenant" WHERE "organizationId" = ANY($1::text[])`,
          [orgIds],
        );

        // Delete all memberships for these orgs
        await client.query(
          `DELETE FROM "member" WHERE "organizationId" = ANY($1::text[])`,
          [orgIds],
        );

        // Delete organizations
        await client.query(
          `DELETE FROM "organization" WHERE id = ANY($1::text[])`,
          [orgIds],
        );
      }

      // Delete sessions
      await client.query('DELETE FROM "session" WHERE "userId" = $1', [userId]);

      // Delete accounts (Better Auth oauth/credential records)
      await client.query('DELETE FROM "account" WHERE "userId" = $1', [userId]);

      // Finally delete the user record
      await client.query('DELETE FROM "user" WHERE id = $1', [userId]);

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

/**
 * Clean up multiple test users in a single transaction where possible.
 * Convenience wrapper for afterEach blocks.
 */
export async function cleanupTestUsers(emails: string[]): Promise<void> {
  await Promise.all(emails.map(cleanupTestUser));
}
