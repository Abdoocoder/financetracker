<!-- generated-by: gsd-doc-writer -->
# Configuration Reference

This document covers all environment variables, configuration files, required settings, defaults, and per-environment overrides for the FinanceTracker (Fajrak) application.

---

## Environment Variables

### Web Application (Next.js)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| **App Config** |
| `NEXT_PUBLIC_APP_URL` | Yes | `http://localhost:3000` | Public URL of the deployed application (used for absolute URLs in emails, webhooks, etc.) |
| `NEXT_PUBLIC_APP_NAME` | No | `Fajrak FinanceTracker` | Display name shown in UI and notifications |
| `TIMEZONE_OFFSET_HOURS` | No | `3` | Server timezone offset in hours (used by cron jobs for date calculations) |
| **Supabase Config** |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | — | Supabase project URL (e.g., `https://xxxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | — | Supabase anonymous/public key for client-side access |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (server) | — | Service role key for admin/server operations (bypasses RLS) |
| **E2E Testing (Playwright)** |
| `E2E_TEST_EMAIL` | E2E only | — | Dedicated test account email for authenticated E2E runs |
| `E2E_TEST_PASSWORD` | E2E only | — | Password for the E2E test account |
| **Firebase Config (Push Notifications)** |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes | — | Firebase web API key (client-side) |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Yes | — | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Yes | — | Firebase Cloud Messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Yes | — | Firebase web app ID |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Yes | — | VAPID public key for web push (FCM) |
| `FIREBASE_CLIENT_EMAIL` | Yes (server) | — | Service account email for Firebase Admin SDK |
| `FIREBASE_PRIVATE_KEY` | Yes (server) | — | Service account private key (newline-escaped) |
| **Web Push (VAPID)** |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Yes | — | VAPID public key for browser push subscriptions |
| `VAPID_PRIVATE_KEY` | Yes (server) | — | VAPID private key for signing push messages |
| `VAPID_EMAIL` | Yes | — | Contact email for VAPID (used in `mailto:` header) |
| **Market Data & APIs** |
| `TWELVE_DATA_KEY` | No | — | API key for Twelve Data (stock/crypto prices) |
| `NEXT_PUBLIC_EXCHANGE_RATE_KEY` | No | — | Exchange rate API key for currency conversion |
| **Cron Job Security** |
| `CRON_SECRET` | Yes | — | Shared secret for authenticating cron job requests (fail-closed if missing) |
| **BYOK LLM Proxy (Feature A)** |
| `BYOK_PRIVATE_KEY` | Yes (server) | — | RSA-OAEP-SHA256 private key (PKCS#8 PEM) for decrypting user provider keys |
| `NEXT_PUBLIC_BYOK_PUBLIC_KEY` | Yes | — | RSA public key (SPKI PEM) distributed to clients for envelope encryption |
| `NEXT_PUBLIC_BYOK_KEK_ID` | Yes | — | Key ID tag placed on every envelope for rotation support |
| `BYOK_PROXY_DEBUG` | No | `false` | Set to `true` for verbose per-request logging (dev only) |
| **Monitoring (Sentry)** |
| `NEXT_PUBLIC_SENTRY_DSN` | Yes | — | Sentry DSN (must match `org`/`project` in `next.config.mjs`) |
| `SENTRY_AUTH_TOKEN` | No | — | Auth token for Sentry CLI (source map uploads) |
| `SENTRY_ORG` | No | `abdoocoder-m2` | Sentry organization slug (override if DSN differs) |
| `SENTRY_PROJECT` | No | `javascript-nextjs` | Sentry project slug (override if DSN differs) |
| `SENTRY_TUNNEL_ROUTE` | No | `/monitoring` | Tunnel route for ad-blocker circumvention |
| **Vercel System** |
| `VERCEL_OIDC_TOKEN` | Auto | — | Injected automatically by Vercel at deploy time |

### Mobile Application (Flutter)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SUPABASE_URL` | Yes | — | Supabase project URL (same as web) |
| `SUPABASE_ANON_KEY` | Yes | — | Supabase anonymous key (same as web) |
| `FIREBASE_API_KEY` | Yes | — | Firebase Android API key |
| `FIREBASE_AUTH_DOMAIN` | Yes | — | Firebase auth domain (e.g., `fajrak.firebaseapp.com`) |
| `FIREBASE_PROJECT_ID` | Yes | — | Firebase project ID |
| `FIREBASE_STORAGE_BUCKET` | Yes | — | Firebase storage bucket |
| `FIREBASE_MESSAGING_SENDER_ID` | Yes | — | FCM sender ID |
| `FIREBASE_APP_ID` | Yes | — | Firebase Android app ID |
| `FIREBASE_MEASUREMENT_ID` | No | — | Firebase Analytics measurement ID |

---

## Configuration Files

### `next.config.mjs`
Next.js configuration with Sentry integration, security headers, and experimental features.

```js
// Key settings
experimental: {
  optimizePackageImports: ['lucide-react', 'recharts'],
}
serverExternalPackages: ['firebase-admin'],
headers: [
  // Security headers (CSP, HSTS, etc.)
  // Service worker permissions
]
// Sentry config: org, project, tunnelRoute, source map uploads
```

**Notable environment-dependent settings:**
- `org` / `project`: Read from `SENTRY_ORG` / `SENTRY_PROJECT` (with defaults)
- `tunnelRoute`: Read from `SENTRY_TUNEL_ROUTE` (default `/monitoring`)
- `silent`: `!process.env.CI` (only upload source maps in CI)

### `tailwind.config.js`
Tailwind CSS v4 configuration with custom theme, dark mode, and plugin setup.

### `eslint.config.mjs`
ESLint flat config with TypeScript, React, Next.js, and accessibility rules.

### `jest.config.js`
Jest configuration for unit/integration tests with React Testing Library.

### `playwright.config.ts`
Playwright E2E test configuration with CI-specific workers/retries.

### `sentry.server.config.ts` / `sentry.edge.config.ts` / `instrumentation.ts`
Sentry SDK configuration for server, edge, and client runtimes.

---

## Required vs Optional Settings

### Startup-Failure Required (Application crashes if missing)

| Variable | Validation Location | Error Behavior |
|----------|---------------------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/supabase/client.ts:10`, `lib/supabase/server.ts:19`, `lib/supabase/admin.ts:24` | Throws `Error` on client/admin creation |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same as above | Throws `Error` on client/admin creation |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase/admin.ts:25` | Throws `Error: "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars. Admin client cannot be constructed."` |
| `CRON_SECRET` | `lib/cron-auth.ts:15-21` | Throws `Error: "CRON_SECRET is not set. Configure it in your environment variables."` (fail-loud) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `lib/firebase.ts:5` | Firebase init fails silently; push notifications break |
| `NEXT_PUBLIC_SENTRY_DSN` | `instrumentation-client.ts:8`, `sentry.server.config.ts:8` | Sentry disabled; no error but no monitoring |

### Optional with Defaults

| Variable | Default | Used In |
|----------|---------|---------|
| `TIMEZONE_OFFSET_HOURS` | `3` | `lib/timezone.ts:6`, cron routes (`auto-salary`, `evening-reminder`, `streak-alert`, `new-user-nudge`) |
| `NODE_ENV` | `development` | Feature flags, Sentry sample rates, cookie security, CSP |
| `BYOK_PROXY_DEBUG` | `false` | `app/api/byok/proxy/route.ts:38` |
| `SENTRY_ORG` | `abdoocoder-m2` | `next.config.mjs:51` |
| `SENTRY_PROJECT` | `javascript-nextjs` | `next.config.mjs:52` |
| `SENTRY_TUNNEL_ROUTE` | `/monitoring` | `next.config.mjs:65` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4318` | `observability/otel/index.ts:24` |

---

## Defaults

Defaults are defined inline at the point of use:

| Variable | Default Value | Source |
|----------|---------------|--------|
| `TIMEZONE_OFFSET_HOURS` | `3` | `lib/timezone.ts:6` — `const hours = Number(process.env.TIMEZONE_OFFSET_HOURS) \|\| 3` |
| `NODE_ENV` | `'development'` | Multiple files — `process.env.NODE_ENV === 'production'` checks |
| `BYOK_PROXY_DEBUG` | `false` | `app/api/byok/proxy/route.ts:38` — `process.env.BYOK_PROXY_DEBUG === 'true'` |
| `SENTRY_ORG` | `'abdoocoder-m2'` | `next.config.mjs:51` |
| `SENTRY_PROJECT` | `'javascript-nextjs'` | `next.config.mjs:52` |
| `SENTRY_TUNNEL_ROUTE` | `'/monitoring'` | `next.config.mjs:65` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `'http://localhost:4318'` | `observability/otel/index.ts:24` |
| Sentry `tracesSampleRate` | `1.0` (dev) / `0.1` (prod) | `sentry.server.config.ts:19`, `sentry.edge.config.ts:20` |
| Playwright `retries` | `2` (CI) / `1` (local) | `playwright.config.ts:24` |
| Playwright `workers` | `1` (CI) / `2` (local) | `playwright.config.ts:26` |

---

## Per-Environment Overrides

The project uses explicit `.env.*` files for environment-specific configuration:

| File | Purpose | Variables Overridden |
|------|---------|---------------------|
| `.env.local` | Local development overrides (gitignored) | All variables — developer-specific secrets |
| `.env.e2e` | E2E test environment (local Supabase) | `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`, `SUPABASE_SERVICE_ROLE_KEY=...`, `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD` |
| `.env.local.e2e-backup` | Backup of local E2E config | Same as `.env.e2e` |

**No `.env.development`, `.env.production`, or `.env.test` files exist.** Environment differences are handled via:
- `NODE_ENV` checks in code (`process.env.NODE_ENV === 'production'`)
- Vercel project settings (production/preview environment variables in dashboard)
- CI/CD pipeline injects secrets at deploy time

### Vercel Environment Variables
Production and preview values are configured in the Vercel dashboard under **Project → Settings → Environment Variables**. These override `.env.local` at deploy time.

### Mobile (Flutter)
- `.env` / `.env.local` in `mobile/fajrak_flutter/` (gitignored)
- `google-services.json` in `android/app/` for Firebase (gitignored)
- No per-environment `.env` files; uses `--dart-define` or flavor-specific builds for CI

---

<!-- VERIFY: Production Sentry DSN must match org/project in next.config.mjs exactly -->
<!-- VERIFY: Supabase project ref for local development is ujwcvtpwsaidljecqbaa -->
<!-- VERIFY: Firebase project IDs (web: fajrak-f7df1, mobile: fajrak) may differ per platform -->
<!-- VERIFY: VAPID keys must be generated as a pair; public key goes to NEXT_PUBLIC_VAPID_PUBLIC_KEY -->
<!-- VERIFY: BYOK RSA keypair must be generated with OpenSSL; private key never leaves server -->