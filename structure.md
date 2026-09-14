# هيكل المشروع — FinanceTracker (Fajrak)

## Web — Next.js 16 App Router

```
app/
├── (auth)/
│   ├── login/page.tsx
│   └── register/page.tsx
├── (dashboard)/
│   ├── layout.tsx
│   ├── dashboard/page.tsx
│   ├── transactions/page.tsx
│   ├── debts/page.tsx
│   ├── investments/page.tsx
│   ├── alerts/page.tsx
│   ├── budgets/page.tsx
│   ├── goals/page.tsx
│   └── settings/page.tsx
├── download/page.tsx
├── api/
│   ├── alerts/route.ts
│   ├── api-keys/
│   │   ├── create/route.ts
│   │   ├── revoke/route.ts
│   │   └── list/route.ts
│   ├── byok/proxy/route.ts          ← stateless thin proxy
│   ├── cron-alerts/route.ts
│   ├── cron-salary/route.ts
│   ├── cron-debt/route.ts
│   ├── cron-penalty/route.ts
│   ├── cron-reset/route.ts
│   ├── cron-subscriptions/route.ts
│   ├── cron-goals/route.ts
│   ├── mcp/route.ts                 ← MCP server (Streamable HTTP)
│   ├── push/subscribe/route.ts
│   ├── push/test/route.ts
│   ├── send/route.ts
│   ├── webhook/transaction/route.ts
│   └── monitoring/route.ts          ← Sentry tunnel proxy
├── layout.tsx
└── page.tsx                         ← landing page
```

## Components

```
components/
├── ui/              ← shadcn/ui primitives
├── dashboard/
│   ├── StatsCards.tsx
│   ├── BudgetChart.tsx
│   ├── DebtProgress.tsx
│   ├── InvestmentTracker.tsx
│   └── AlertBanner.tsx
├── investments/
│   └── WealthSimulator.tsx
├── layout/
│   ├── Sidebar.tsx
│   └── Header.tsx
├── budgets/          ← BudgetCategoryCard, BudgetChart
├── goals/            ← GoalCard, GoalProgress
├── alerts/           ← AlertSettings
└── settings/
    ├── sections.tsx
    ├── section-common.tsx
    ├── api-keys-section.tsx
    └── byok-keys-section.tsx
```

## Lib

```
lib/
├── supabase/
│   ├── client.ts          ← createBrowserClient()
│   ├── server.ts          ← createServerClient (cookie-based)
│   ├── middleware.ts       ← session refresh
│   └── admin.ts           ← service-role client (server-only)
├── byok/
│   ├── envelope.ts        ← RSA-OAEP + AES-GCM decrypt (server-only, BYOK_PRIVATE_KEY)
│   ├── providers.ts       ← SSRF allowlist + auth types
│   └── types.ts
├── api-keys.ts            ← SHA-256 PAT management
├── cron-auth.ts           ← timingSafeEqual bearer check
├── rate-limit.ts          ← per-key rate limiter
├── i18n.tsx               ← React i18n context
├── firebase.ts            ← Firebase Admin init
├── currencies.ts          ← currency code list
└── locales/
    ├── ar/                ← Arabic domain files (alerts, transactions, etc.)
    └── en/                ← English domain files
```

## Types

```
types/
└── index.ts               ← shared TypeScript types
```

## Database — Supabase Migrations

```
supabase/migrations/
├── legacy/
│   ├── 001_initial.sql … 041_*.sql    ← original schema
│   └── (41 files)
├── 0042_add_user_api_keys.sql
├── 0043_add_api_audit_log.sql
├── 20260901000000_add_deleted_at.sql
├── 20260901120000_add_notification_history.sql
├── 20260901130000_add_user_stats.sql
├── 20260907083248_verify_owner_in_user_rpcs.sql
├── 20260902000000_add_saving_challenges.sql
├── 20260902010000_add_health_score_history.sql
└── … (53 total SQL files)
```

### Core Tables (29)

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (extends `auth.users`); currency, timezone, salary_day, plan, avatar |
| `accounts` | Bank accounts; supports soft delete via `deleted_at` |
| `transactions` | Income & expenses; `deleted_at` for soft delete |
| `debts` | Owed + receivable; `debt_type` field |
| `debt_payments` | Payment history log |
| `investments` | Portfolio holdings |
| `investment_transactions` | Buy/sell history |
| `investment_cash` | Cash balance from sell proceeds |
| `budgets` | Monthly category limits |
| `alerts` | Smart notification records |
| `savings_goals` | Financial targets |
| `user_api_keys` | PAT storage (SHA-256 hash, scopes) |
| `api_audit_log` | Per-key request audit trail |
| `testimonials` | User reviews (public read) |
| `push_subscriptions` | FCM + Web Push tokens |
| `notification_history` | Deduplicated push delivery log |
| `user_stats` | Gamification state (XP, level, streak) |
| `health_score_history` | Daily score snapshots |
| `saving_challenges` | Savings challenge templates |

### Key RPCs

| RPC | Purpose |
|-----|---------|
| `get_account_balances` | Returns sum of balances per account |
| `get_financial_dashboard` | Full dashboard aggregation |
| `delete_user_account` | Owner-guarded account deletion |

### Security

- **RLS** on every table — never disabled.
- Cron endpoints authenticate via `Authorization: Bearer <CRON_SECRET>` + `timingSafeEqual`.
- External agents / MCP / webhook use per-user PATs (`fjk_live_…`) with SHA-256 hash storage.
- BYOK proxy: AES-GCM + RSA-OAEP envelope; keys never leave the browser.

## Mobile — Flutter (`mobile/fajrak_flutter/`)

```
mobile/fajrak_flutter/
├── lib/
│   ├── screens/          ← accounts, dashboard, transactions, debts, investments, goals, budgets, alerts, settings, help
│   ├── widgets/          ← reusable widgets per feature
│   ├── services/         ← AccountsService, InvestmentsService, CurrencyService, etc.
│   └── main.dart
├── assets/i18n/
│   ├── ar.json           ← Arabic
│   └── en.json           ← English
├── Makefile              ← make doctor, make build-apk
└── pubspec.yaml          ← version 3.40.0+51
```

- Uses **Supabase Flutter SDK** (not REST directly).
- Uses **easy_localization** for i18n.
- Uses **Drift** for local database.
- `make doctor` = `flutter analyze` + `flutter test` (zero issues required).
