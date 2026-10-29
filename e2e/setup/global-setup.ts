import { chromium, type FullConfig } from '@playwright/test';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { assertAuthenticatedSession } from './session';

// This file lives at <repoRoot>/e2e/setup/global-setup.ts, so the project root
// is two levels up. Resolving off __dirname (instead of process.cwd()) is
// deterministic and independent of where Playwright was launched from.
const ROOT = path.resolve(__dirname, '..', '..');

// Playwright's globalSetup runs in plain Node and does NOT auto-load .env files
// (that's Next.js build-time behavior). Load the E2E-specific env file explicitly
// so E2E_TEST_* vars and local Supabase credentials are available.
loadEnv({ path: path.join(ROOT, '.env.e2e'), override: true });

// StorageState written here MUST match the relative `storageState` string used
// in the specs ('e2e/.auth/user.json'), which Playwright resolves from the
// config file's directory (the project root).
const AUTH_FILE = path.join(ROOT, 'e2e', '.auth', 'user.json');

// Use system Chromium binary from snap (via env var or direct path)
const CHROMIUM_EXECUTABLE = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || 
  '/snap/chromium/current/usr/lib/chromium-browser/chrome';

/**
 * Global setup: log in once with the dedicated E2E test account and persist
 * the authenticated session (cookies + localStorage) to storageState so that
 * authenticated specs can reuse it via test.use({ storageState }).
 *
 * Requires E2E_TEST_EMAIL and E2E_TEST_PASSWORD env vars (see .env.e2e).
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

  // Use system Chromium binary directly
  const browser = await chromium.launch({ executablePath: CHROMIUM_EXECUTABLE });
  const page = await browser.newPage();

  // The login UI renders Arabic (default here). Serve it in 'ar' so the Arabic
  // locators match — mirror the addInitScript used by the other specs.
  await page.addInitScript(() => {
    localStorage.setItem('lang', 'ar');
  });

  try {
    // Increase timeout for initial page load (Next.js compilation on first request)
    await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Wait for the form to be fully interactive (hydration complete)
    await page.waitForLoadState('networkidle');
    
    await page.getByPlaceholder('you@example.com').fill(email);
    await page.getByPlaceholder('••••••••').fill(password);
    
    // Try clicking the submit button with force to ensure it triggers
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click({ force: true });
    
    // Wait for auth to complete and cookies/localStorage to be written.
    // Login redirects to /dashboard (or /onboarding for a fresh account).
    try {
      await page.waitForURL(
        (url) => ['/dashboard', '/onboarding'].some((p) => url.pathname.startsWith(p)),
        { timeout: 30000 }
      );
    } catch {
      // Don't hard-fail setup on a slow/exotic redirect — the session may
      // still be set. assertAuthenticatedSession below decides, loudly.
      console.warn(
        '[global-setup] Did not reach /dashboard or /onboarding after login; ' +
        'asserting the session will catch a missing auth token.'
      );
      // Wait a bit for any pending navigation
      await page.waitForTimeout(2000);
    }

    // Give the client a moment to hydrate the persisted session.
    await page.waitForTimeout(2000);

    // Fail loudly instead of persisting an empty session. Regression (Sep
    // 2026): the old code swallowed the nav failure and saved '{"cookies":[]}',
    // so authenticated specs silently started logged-out.
    const state = await page.context().storageState();
    console.log('[global-setup] Storage state cookies:', state.cookies?.length);
    console.log('[global-setup] Storage state origins:', state.origins?.length);
    if (state.origins?.length > 0) {
      state.origins.forEach((o, i) => {
        console.log(`[global-setup] Origin ${i}:`, o.origin, 'localStorage entries:', o.localStorage?.length);
        if (o.localStorage) {
          o.localStorage.forEach((entry: {name: string; value: string}) => {
            if (entry.name.includes('auth') || entry.name.includes('supabase')) {
              console.log(`[global-setup]   Found auth-related localStorage:`, entry.name);
            }
          });
        }
      });
    }
    assertAuthenticatedSession(state, `${baseURL}/login`);

    await page.context().storageState({ path: AUTH_FILE });
    console.log(`[global-setup] Saved authenticated session to ${AUTH_FILE}`);
  } finally {
    await browser.close();
  }
}
