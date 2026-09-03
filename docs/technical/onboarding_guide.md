# FinanceTracker (Fajrak) — Onboarding Guide

> Generated from a full codebase onboarding of the FinanceTracker (Fajrak) project.
> Companion to `CLAUDE.md` (agent instructions), `PRODUCT.md`, `VISION.md`, `DESIGN.md`.

## 1. What this is

**Fajrak (فجرك)** is a personal finance app (Arabic-first, Kuwait/Gulf region) delivered on two platforms sharing one Supabase backend:

- **Web** — Next.js 16 (App Router) + React 19 + TypeScript (strict)
- **Mobile** — Flutter (`mobile/fajrak_flutter/`), name *Fajrak*

Current version: `3.38.0` (see `mobile/fajrak_flutter/pubspec.yaml`). Default currency **KWD** (per-user overridable via `profiles`).

## 2. High-level architecture

```
                 ┌───────────────────────────────────────────────┐
                 │                    Supabase                    │
                 │   PostgreSQL (19 tables, RLS enforced)         │
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

- **18 pages** across `(auth)` + `(dashboard)`: dashboard, transactions, debts, investments, alerts, budgets, goals, settings, etc.
- **26 API routes** under `app/api/`: `alerts/`, `cron/*`, `push/*`, `gamification`, `webhook`, `api-keys`, etc.
- `proxy.ts` matcher excludes `_next/static`, `_next/image`, icons, `manifest.json`, `sw.js`, `api/cron`.

## 7. Mobile surface map (`mobile/fajrak_flutter/lib/`)

- **24 screens** — accounts, dashboard, transactions, debts, investments, goals, budgets, alerts, settings, help.
- **9 services** — `AccountsService`, `InvestmentsService`, `CurrencyService`, etc.
- **67 widgets** — organized per feature (`widgets/dashboard/`, `widgets/transactions/`, …, `widgets/common/`).

## 8. Database map

19 tables via 40 numbered migrations in `supabase/migrations/`. Migrations are **sequentially numbered — add a new one, never edit existing**.

## 9. Testing

- **Jest 30 / jsdom** — 32 suites / 358 tests (unit: `api/`, `hooks/`, `lib/`, `integration/`, `types/`). All passing.
- **Playwright** — `e2e/` (smoke + auth-flow passing; `transaction-management` **skipped — needs auth fixture**).
- **Flutter** — `make doctor` (analyze + test, zero issues required).
- Shared Supabase mock: `chainProxy` pattern in `__tests__/helpers/`.

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
| UI components | `components/ui/`, `components/dashboard/`, `components/layout/` |
| Types | `types/` |
| i18n | `lib/i18n.tsx`, `lib/i18n-server.ts` |
| Currency | `lib/currencies.ts`, `lib/currency.ts`, `lib/detectCurrency.ts` |
| Supabase clients | `lib/supabase/` |
| Migrations | `supabase/migrations/` |
| Cron config | `vercel.json` |
| Mobile | `mobile/fajrak_flutter/lib/{screens,widgets,services}` |
| Styling tokens | CSS vars `--text-*`, `--bg-*`, `--border`, `--accent-*`, `--shadow-card` |
