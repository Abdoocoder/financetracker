import { chromium, type FullConfig } from '@playwright/test';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';

// This file lives at <repoRoot>/e2e/setup/global-setup.ts, so the project root
// is two levels up. Resolving off __dirname (instead of process.cwd()) is
// deterministic and independent of where Playwright was launched from.
const ROOT = path.resolve(__dirname, '..', '..');

// Playwright's globalSetup runs in plain Node and does NOT auto-load .env.local
// (that's Next.js build-time behavior). Load it explicitly so E2E_TEST_* vars
// are available. override:true lets real shell-exported vars take precedence.
loadEnv({ path: path.join(ROOT, '.env.local'), override: true });

// StorageState written here MUST match the relative `storageState` string used
// in the specs ('e2e/.auth/user.json'), which Playwright resolves from the
// config file's directory (the project root).
const AUTH_FILE = path.join(ROOT, 'e2e', '.auth', 'user.json');

/**
 * Global setup: log in once with the dedicated E2E test account and persist
 * the authenticated session (cookies + localStorage) to storageState so that
 * authenticated specs can reuse it via test.use({ storageState }).
 *
 * Requires E2E_TEST_EMAIL and E2E_TEST_PASSWORD env vars (see .env.example).
 * Uses Supabase PKCE flow — tokens live in localStorage, captured by
 * page.context().storageState().
 */
export default async function globalSetup(config: FullConfig) {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;

  if (!email || !password) {
    console.warn(
      '[global-setup] E2E_TEST_EMAIL/E2E_TEST_PASSWORD not set. ' +
      'Authenticated tests will skip because their storageState cannot be created.'
    );
    return;
  }

  const { baseURL } = config.projects[0].use;
  if (!baseURL) throw new Error('[global-setup] baseURL is not configured');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  // The login UI renders Arabic (default here). Serve it in 'ar' so the Arabic
  // locators match — mirror the addInitScript used by the other specs.
  await page.addInitScript(() => {
    localStorage.setItem('lang', 'ar');
  });

  try {
    await page.goto(`${baseURL}/login`);
    await page.getByPlaceholder('you@example.com').fill(email);
    await page.getByPlaceholder('••••••••').fill(password);
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click();

    // Wait for auth to complete and cookies/localStorage to be written.
    // Login redirects to /dashboard (or /onboarding for a fresh account).
    await page
      .waitForURL(
        (url) => ['/dashboard', '/onboarding'].some((p) => url.pathname.startsWith(p)),
        { timeout: 15000 }
      )
      .catch(() => {
        // Don't fail if redirect target differs slightly — cookies may still be set.
      });

    // Give the client a moment to hydrate the persisted session.
    await page.waitForTimeout(1000);

    await page.context().storageState({ path: AUTH_FILE });
    console.log(`[global-setup] Saved authenticated session to ${AUTH_FILE}`);
  } finally {
    await browser.close();
  }
}
