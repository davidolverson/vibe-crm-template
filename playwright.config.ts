import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env.local so DATABASE_URL and other secrets are available to test
// workers (helpers.ts uses DATABASE_URL for cleanup queries).
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

/**
 * Playwright E2E test configuration for VIBE.
 * Runs against a local dev server on port 3000.
 * Only Chromium is used to keep the suite fast.
 *
 * Run with:
 *   npm run test:e2e
 *
 * Docs: https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',

  // Auth tests create real DB rows -- run one at a time to avoid collisions
  fullyParallel: false,
  workers: 1,

  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,

  // Per-test timeout
  timeout: 30_000,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
  ],

  use: {
    baseURL: 'http://localhost:3000',

    // Capture on failure only -- keeps output clean
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',

    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true, // reuse if already running locally
    timeout: 60_000,
  },

  outputDir: 'test-results',
});
