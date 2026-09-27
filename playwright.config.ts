import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const ROOT = path.resolve(__dirname);

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',

  /* Run global-setup once to build the authenticated storageState. */
  globalSetup: './e2e/setup/global-setup.ts',
  /* Maximum time one test can run for. */
  timeout: 60 * 1000,
  expect: {
    timeout: 10000
  },
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : 2,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Use system Chromium via channel (uses system Chrome/Chromium)
        channel: 'chromium',
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'node scripts/e2e-dev-server.js',
    url: 'http://localhost:3000/api/health',
    reuseExistingServer: true,
    timeout: 180 * 1000,
  },
});
