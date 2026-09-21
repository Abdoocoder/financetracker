# FinanceTracker (Fajrak) — Onboarding Guide

> Generated from a full codebase onboarding of the FinanceTracker (Fajrak) project.
> Companion to `CLAUDE.md` (agent instructions), `PRODUCT.md`, `VISION.md`, `DESIGN.md`.

## 1. What this is

**Fajrak (فجرك)** is a personal finance app (Arabic-first, Kuwait/Gulf region) delivered on two platforms sharing one Supabase backend:

- **Web** — Next.js 16 (App Router) + React 19 + TypeScript (strict)
- **Mobile** — Flutter (`mobile/fajrak_flutter/`), name *Fajrak*

Current version: `3.41.0+53` (see `mobile/fajrak_flutter/pubspec.yaml`). Web and mobile versions may drift between releases (web is currently v3.40.0). Default currency on the **live** DB is **JOD** on `profiles.currency` (per-user overridable) — see §14 drift notes; earlier docs referencing KWD are stale.

## 2. High-level architecture

```
                 ┌───────────────────────────────────────────────┐
                 │                    Supabase                    │
                 │   PostgreSQL (28 tables, RLS enforced)         │
                 │   Auth (Supabase Auth)                         │
                 │   Realtime (alerts count etc.)                 │
                 └───────────────┬───────────────────────────────┘
                                 │        (anon key + RLS / service-role)
                 ┌───────────────┴───────────────────────────────┐
                 │                                               │
   ┌─────────────┴───────────┐                     ┌─────────────┴───────────┐
   │  Web — Next.js 16        │                     │  Mobile — Flutter       │
   │  App Router              │                     │  Provider + Supabase SDK │
   │  TanStack Query v5       │                     │  offline-first Drift DB  │
   │  i18n ar/en (RTL)        │                     │  easy_localization ar/en │
   └─────────────────────────┘                     └─────────────────────────┘
```

### Architecture patterns
- **Route groups** — `app/(auth)` and `app/(dashboard)`.
- **Three Supabase clients** — `lib/supabase/{client,server,admin}.ts` (browser / RLS-respecting server / service-role).
- **RPC-heavy dashboard** — server-side `calculate_health_score()` and dashboard RPCs.
- **TanStack Query v5** for all client-side Supabase fetches (`hooks/`).
- **Offline-first on mobile** — Drift / SQLCipher local DB + bidirectional `SyncService`.
- **Soft delete** — `deleted_at` columns + sync RPCs.
- **Multi-currency** — 45+ currencies (`lib/currencies.ts`, `currency.ts`, `detectCurrency.ts`).
- **3-tier notifications** — Web Push (Firebase), in-app alerts, Vercel cron jobs.
- **Auth for non-session clients** — external agents/MCP/webhooks authenticate with per-user PATs (`fjk_live_…`, see `docs/technical/api_integration_guide.md`), cron jobs with a shared `CRON_SECRET`; the BYOK proxy accepts either the web session cookie or a Supabase JWT (`Authorization: Bearer …`).
- **BYOK (Bring-Your-Own-Key)** — user's LLM keys live only on their device; per request the key is wrapped as an AD-4 envelope (`payload` = AES-GCM with an ephemeral key, `env` = that ephemeral key RSA-OAEP-wrapped to the server's public key) and only the server's RSA private key can unwrap it. Providers are SSRF-allowlisted in `lib/byok/providers.ts`; the thin proxy (`app/api/byok/proxy/route.ts`) never parses the body (base64 passthrough) and rate-limits per user (30/min) via `bump_proxy_usage()`. Mobile mirrors this in `services/byok/` (flutter_secure_storage vault + `buildEnvelope`).

## 3. Key entry points

| Entry | File | Role |
|-------|------|------|
| Root layout | `app/layout.tsx` | Cairo font, theme pre-hydration script, provider stack, SW registration |
| **Auth gate** | `proxy.ts` (root) | Next.js **16** uses `proxy.ts`/`proxy()` (NOT `middleware.ts`). Protects 8 paths; redirects unauth → `/login`; passes `x-user-id`/`x-user-email` headers |
| Dashboard layout | `app/(dashboard)/layout.tsx` | Sidebar, Header, realtime alerts count, Toast, ErrorBoundary, push/install/welcome prompts, FAB |
| Auth layout | `app/(auth)/layout.tsx` | Minimal — just `I18nProvider` |
| Mobile entry | `mobile/fajrak_flutter/lib/main.dart` | init: .env → localization → Firebase+Supabase → encrypted DB → runApp |

> **Auth guarding is dual-layer:** edge redirect (`proxy.ts`) + client session (`lib/user-context.tsx` via `onAuthStateChange`). There is **no `middleware.ts`** in this codebase — don't look for one.

## 4. Provider stack (web)

```
RootLayout
└─ QueryProvider (TanStack Query v5)
   └─ UserProvider (Supabase auth → profiles)     [lib/user-context.tsx]
      └─ I18nProvider (lang, dir, t())             [lib/i18n.tsx]
         └─ ThemeProvider (data-theme: dark/light/system)
            └─ page
```
Dashboard adds: `ToastProvider` → `TranslatedErrorBoundary` → `DashboardContent`.

## 5. Data-access layers

```
lib/supabase/
├── client.ts   → browser client (PKCE, token refresh)   [Client Components]
├── server.ts   → createServerClient (RLS via cookies)   [Server Components]
└── admin.ts    → service-role (bypasses RLS)            [server-only: cron/admin]
```
- **RLS is always on** — never disable it.
- Use server/client split per the CLAUDE.md conventions; `admin` only where service-role is truly required.

## 6. Web surface map

- **24 pages** (`app/**/page.tsx`): landing `/`, `download`, `privacy`, `terms`; 5 auth pages (`onboarding`, `login`, `register`, `forgot-password`, `reset-password`); 15 dashboard pages (`dashboard`, `transactions`, `debts`, `investments`, `goals`, `budgets`, `alerts`, `settings`, `accounts`, `zakat`, `chat`, `help`, `learn`, `fire`, `pdf-report`).
- **29 API routes** under `app/api/` (Route Handlers): `alerts/`, cron jobs (`auto-debt`, `auto-recurring`, `auto-salary`, `budget-alerts`, `daily-reminder`, `evening-reminder`, `zakat-reminder`, `streak-alert`, `weekly-report`, `new-user-nudge`, `smart-notifications`), push (`push-send`, `push-subscribe`, `push-test`), `exchange-rate`, `stock-price`, `health`, `health-score-snapshot`, `gamification`, `testimonials`, `confirm`, `auth/callback`, `api-keys/{create,revoke}`, `byok/proxy`, `mcp`, `webhook/transaction`, `zakat/prices`.
- `proxy.ts` matcher excludes `_next/static`, `_next/image`, favicon/icons, `manifest.json`, `sw.js`, `api/cron`.

## 7. Mobile surface map (`mobile/fajrak_flutter/lib/`)

- **25 screens** (`lib/screens/`) — accounts, dashboard, transactions (`transactions/`, `transactions/recurring`), debts, investments, goals, budgets, alerts, settings (`settings/`, `settings/notification_settings`), help, learn, chat, achievements, splash, main_screen, more (`more/`, `more/fire_calculator`, `more/zakat_calculator`), auth (`login`, `register`, `onboarding`, `forgot_password`, `reset_password`).
- **9 services** (`lib/services/`) — `AccountsService`, `FinanceService`, `CurrencyService`, `InvestmentsService`, `AnalyticsService`, `LlmService`, `NotificationService`, `PdfReportService`, `SyncService`. Plus nested `services/byok/` (BYOK chat/vault/envelope/providers) and `services/repositories/` — **15** `.dart` files total.
- **70 widgets** — organized per feature (`widgets/dashboard/`, `widgets/transactions/`, …, `widgets/common/`).

## 8. Database map

19+ tables (verified against migrations). Migrations live in `supabase/migrations/` — **11 top-level files** (`042`, `043`, plus nine dated `2026-09xx` hardening migrations) plus a `legacy/` folder holding the older `001`–`041` set (**42 files**). Migrations are **sequentially numbered — add a new one, never edit existing**. Newer migrations use dated `YYYYMMDDHHMMSS_name.sql` names rather than the old `NNN_name.sql` scheme.

## 9. Testing

- **Jest / jsdom** — 58 suites / 531 tests (unit: `api/`, `hooks/`, `lib/`, `integration/`, `types/`). All passing. Coverage ≈48% statements / 31% branches.
- **Playwright** — `e2e/` (smoke + auth-flow + `transaction-management` all passing). Authenticated specs need a test account via `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` in `.env.local`; `globalSetup` builds `e2e/.auth/user.json` automatically.
- **Flutter** — `make doctor` (analyze + test, zero issues required).
- Shared Supabase mock: `chainProxy` pattern in `__tests__/hooks/`.

## 10. Conventions (recap — full list in `CLAUDE.md`)

- **i18n keys** — prefixed: `dash_*`, `tx_*`, `debts_*`, `budget_*`, `goals_*`, `invest_*`, `alerts_*`, `settings_*`, `help_faq_*`.
- **UX standards** — `ConfirmDialog` for all destructive actions; `aria-label` on every icon button; `autoFocus` on primary form input; skeletons (`.skeleton`) for loading — not text/spinner only.
- **Forms (Flutter)** — `if (_saving) return;` guard first, then synchronous `_saving = true; setState`, then `try/catch/finally` with `setState(() => _saving = false)` in `finally`.
- **TypeScript** — strict mode, no `any` unless unavoidable.
- Images via `next/image`, dynamic imports always have a `loading:` skeleton fallback.
- Support email is `support@fajrak.com` — never `abdooraf3@gmail.com`.

## 11. Getting started

```bash
npm install
npm run dev          # web dev server

# full health check
npm run doctor       # lint + typecheck + coverage + build

# mobile
cd mobile/fajrak_flutter
flutter pub get
make doctor
```

## 12. Quick orientation map

| Concern | Where to look |
|---------|---------------|
| Routes | `app/**/page.tsx` |
| API routes | `app/api/**/route.ts` |
| Hooks (data) | `hooks/` |
- **UI components** | `components/ui/`, `components/dashboard/`, `components/investments/`, `components/layout/`, `components/settings/`
| Types | `types/` |
| i18n | `lib/i18n.tsx`, `lib/i18n-server.ts`, translations in `lib/locales/{ar,en}/` (per-domain files merged in `index.ts`) |
| Auth (PATs / cron / BYOK) | `lib/api-keys.ts`, `lib/cron-auth.ts`, `lib/byok/` (envelope.ts **server-only**, providers.ts SSRF allowlist, types.ts wire contract) |
| Currency | `lib/currencies.ts`, `lib/currency.ts`, `lib/detectCurrency.ts` |
| Supabase clients | `lib/supabase/` |
| Migrations | `supabase/migrations/` |
| Cron config | `vercel.json` |
| Mobile | `mobile/fajrak_flutter/lib/{screens,widgets,services}` |
| Styling tokens | CSS vars `--text-*`, `--bg-*`, `--border`, `--accent-*`, `--shadow-card` |

> The old layout doc `docs/technical/structure.md` was **removed** — it referenced `middleware.ts`, `lib/utils.ts`, and `001_initial.sql`, all of which were superseded (auth gate is now `proxy.ts`). Prefer this guide and `CLAUDE.md`.

## 13. Testing & E2E (Sep 2026)

### Unit Tests (Jest)
- 58 suites / 540 tests across `api/`, `hooks/`, `lib/`, `integration/`, `types/`
- Run: `npm run test` (or `npm run test:coverage`)
- Shared Supabase mock uses `chainProxy` pattern (`__tests__/hooks/`)
- Coverage: ~48% statements, ~31% branches (dashboard pages/hooks at 0%)

### E2E Tests (Playwright)
- 3 spec files: `smoke`, `auth-flow`, `transaction-management`
- Run: `npm run test:e2e` (requires dev server on port 3000)
- **Global setup** (`e2e/setup/global-setup.ts`): logs in with `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD` from `.env.local`, persists `e2e/.auth/user.json`
- **Fail-loud session validation**: `assertAuthenticatedSession()` in `e2e/setup/session.ts` prevents empty session persistence (regression fix Sep 2026)
- **Known flaky**: `auth-flow.spec.ts` — nav race between Login/Register pages

### Local Playwright Types
- `e2e/playwright-types.ts` — local `StorageState`, `StorageStateCookie`, `StorageStateOrigin` definitions
- Required because `@playwright/test` v1.62.1 doesn't export `StorageState`
- Used by: `__tests__/e2e/session.test.ts`, `e2e/setup/session.ts`

### CSP & `upgrade-insecure-requests`
- `buildCspHeader()` in `proxy.ts` conditionally adds `upgrade-insecure-requests` **only in production** (NODE_ENV=production)
- Development (http://localhost:3000) omits it to prevent SPA router navigations from being rewritten to https → `ERR_SSL_PROTOCOL_ERROR`
- Regression test: `__tests__/proxy-csp.test.ts` mocks NODE_ENV via `Object.defineProperty`

## 14. Live-audit drift notes (Sep 2026)

From a live Supabase/GitHub MCP audit performed Sep 2026. **Repo schema lags production** — the live DB has prod-only objects added via the SQL editor that are not in `supabase/migrations/`:

- `profiles` extra cols on live: `opening_balance`, `salary_day` (check 1–28), `asset_real_estate`, `asset_vehicles`, `asset_jewelry`, `asset_other`, `assets_updated_at`, `phone`, `job_title`, `birth_date`, `avatar_url`, `onboarding_done`, `lang` (check ar/en, default 'ar'), `lesson_streak`, `last_lesson_date`, `monthly_income`, `timezone` (default Asia/Amman), `plan` (check free/pro), `currency` (default **JOD**).
- Prod tables with **no migration file**: `user_stats`, `testimonials`, `saving_challenges`, `health_score_history`.
- Watch out when running `supabase db reset` — the reset branch will be missing all of the above.

Security posture (advisor: 6 WARN, **intentional**): `authenticated` can execute the owner-guarded SECURITY DEFINER RPCs (`delete_user_account`, `get_account_balances`, `get_financial_dashboard`, …); the guard is `auth.uid() = owner` inside the function (migration `20260907083248_verify_owner_in_user_rpcs.sql`) — do not remove it. Leaked-password protection is currently disabled on the auth config. No performance advisories.

## 15. Net worth — 5 duplicate implementations

Net worth is **not** centralized. The same LTV math (cash + investments + debts + assets) is computed in **5 places** — keep them in sync or display diverges:

1. SQL RPC `get_financial_dashboard` — **authoritative** (migration `20260907083248_verify_owner_in_user_rpcs.sql` lines 67–82).
2. `hooks/useDashboardData.ts` (`.computeNetWorth` at line ~102).
3. `components/ui/financial-health-combined.tsx` (`.calculateNetWorth` at lines ~142–148).
4. `mobile/fajrak_flutter/lib/screens/dashboard/dashboard_screen.dart` (line ~182).
5. `app/api/gamification/route.ts` (lines ~138–142).

If the formula changes, update all 5 — the RPC is the source of truth the web clients feed off.

## 16. Monitoring & push notifications

- **Sentry** (web): enabled via `withSentryConfig` in `sentry.client.config.ts` + `sentry.server.config.ts`; Session Replay worker allowed in the CSP. Source maps/wallaby: `SENTRY_AUTH_TOKEN`.
- **Firebase (web + mobile)**: client config (`NEXT_PUBLIC_FIREBASE_*`) + admin (`FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) for push; Web Push via `NEXT_PUBLIC_VAPID_*` / `VAPID_*` keys. See `docs/technical/notification_system_design.md`.
- **Smart notifications cron**: GitHub Actions `smart-notifications.yml` POSTs daily (07:00 UTC) to `https://fajrak.com/api/smart-notifications` with `secrets.CRON_SECRET` — expects HTTP 200.

## 17. CI/CD

- `lint-test-build.yml` — push to `main` / PRs: `npm ci` → `npm run lint` → `npm run typecheck` → `npm run test` (Node 22, ubuntu-latest).
- `supabase-validate.yml` — **DRY-RUN** migration lint on an isolated local stack; never touches the live DB.
- Deploy — Vercel auto-deploys from `main`; Flutter release APK via `make build-apk`.
