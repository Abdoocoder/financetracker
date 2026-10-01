# FinanceTracker (Fajrak) - Project Context

## Overview
A comprehensive personal finance tracking application with:
- **Next.js 16+ App Router** frontend (TypeScript, React 19, Tailwind CSS)
- **Supabase** backend (PostgreSQL 17, Auth, Realtime, Edge Functions)
- **Flutter** mobile app (mobile/fajrak_flutter)
- Internationalization (English, Arabic) — full RTL support
- PWA support with service workers

## Key Features
- Transaction management (income/expense/transfer, recurring, categories, multi-currency)
- Multi-currency support with exchange rates
- Budget tracking and alerts (warning/motivation/reminder/achievement)
- Debt management with auto-deduction (owed + receivable debts)
- Investment tracking and wealth simulation (stocks, ETFs, crypto, halal flag)
- Zakat calculation and reminders (gold, silver, cash, investments, debts)
- Financial health scoring (centralized RPC: `get_health_score()`)
- AI chat assistant (BYOK - Bring Your Own Key, envelope encryption)
- Push notifications (web: VAPID + SW; mobile: Firebase FCM via Edge Function)
- Gamification (streaks, challenges, achievements)
- PDF reports and data export
- MCP (Model Context Protocol) integration

## Architecture
```
/app                    # Next.js App Router pages
  /(auth)               # Auth pages (login, register, onboarding, password reset)
  /(dashboard)          # Protected dashboard routes (with sidebar layout)
  /api                  # API routes (Supabase Edge Functions compatible)
/components             # React components
  /dashboard            # Dashboard widgets and cards (HeroBalance, Cards, Charts, Gamification)
  /landing              # Landing page sections (Hero, Features, Pricing, Testimonials)
  /settings             # Settings sections (API keys, BYOK, notifications)
  /transactions         # Transaction components (Form, List, Filters, Recurring)
  /ui                   # Reusable UI primitives (Modal, Toast, FAB, Skeleton, ErrorBoundary)
  /layout               # Sidebar, Navbar
  /seo                  # JSON-LD structured data
/hooks                  # Custom React hooks (useTransactions, useDashboardData, etc.)
/lib                    # Shared utilities and business logic
  /byok                 # Bring Your Own Key (AI chat: crypto, providers, vault, envelope)
  /supabase             # Supabase client/server/admin helpers
  /unified-tools        # MCP tool definitions
  /locales              # i18n — ALL user-facing text in en/ar subdirectories
  /errors               # Typed error rescue map
/supabase               # Supabase config and migrations
  /migrations           # Database migrations (40+)
    /legacy             # Baseline migrations (001_initial.sql through 041_chats.sql)
  /functions            # Edge Functions (push-notification in Deno)
/e2e                    # Playwright E2E tests (Page Object Model)
/__tests__              # Jest unit/integration tests
/docs                   # Project documentation
/mobile/fajrak_flutter  # Flutter mobile app (Dart)
/observability          # Grafana dashboards, alerts, runbooks
/types                  # Shared TypeScript types (single source of truth)
```

## Tech Stack
- **Frontend**: Next.js 16, React 19, TypeScript 5, Tailwind CSS 3.4
- **Backend**: Supabase (PostgreSQL 17, Auth, Realtime, Storage, Edge Functions)
- **Database**: PostgreSQL with RLS, RPC functions, materialized views
- **Mobile**: Flutter 3.x, Dart
- **Testing**: Jest 30, React Testing Library 16, Playwright 1.63
- **Observability**: Sentry, OpenTelemetry, Grafana
- **AI**: BYOK pattern for LLM integration, MCP server
- **Push**: Firebase FCM (mobile), Web Push VAPID (browser)

## Key Commands
```bash
# Development
npm run dev              # Start Next.js dev server (port 3000)
npm run dev:mobile       # Start Flutter mobile app

# Testing
npm test                 # Run Jest tests
npm run test:e2e         # Run Playwright tests
npm run test:coverage    # Coverage report (target 80%+)

# Database
npm run db:push          # Push migrations to Supabase
npm run db:reset         # Reset local database

# Linting/Typechecking
npm run lint             # ESLint (eslint.config.mjs)
npm run typecheck        # TypeScript strict check (tsconfig.typecheck.json)

# Build
npm run build            # Production build
npm run doctor           # Full health check (lint + typecheck + test + build)
```

## Environment Variables
Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_FIREBASE_*` (for push notifications: API_KEY, AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID, APP_ID, VAPID_KEY)
- `OPENAI_API_KEY` (optional, for server-side AI)

## Important Patterns
1. **Server Components by default** — Use `'use client'` only when needed (state, effects, browser APIs)
2. **Supabase RLS** — All data access through RLS policies (`auth.uid() = user_id`); no manual user_id filtering
3. **RPC Functions** — Complex queries in PostgreSQL functions (`get_health_score`, `get_account_balances`, `get_cashflow_summary`)
4. **BYOK Pattern** — Users bring their own API keys for AI features; envelope encryption in `lib/byok/crypto-utils.ts`; keys never logged
5. **Internationalization** — All user-facing text in `lib/locales/{en,ar}/*.ts`; never hardcode strings
6. **Type Safety** — Shared types in `/types/index.ts` (single source of truth for web + mobile)
7. **Admin client only for system ops** — Crons, webhooks, migrations use `createAdminClient()`; regular code uses `createServerClient()` or `createBrowserClient()`
8. **Real-time via Realtime** — Subscribe to changes via `useRealtime` hook (web) or Flutter Realtime client (mobile)

## Database Schema (Core Tables)
| Table | Purpose |
|-------|---------|
| `profiles` | User profile (extends auth.users): currency, monthly_income, plan, timezone |
| `transactions` | Income/expense/transfer with multi-currency, recurring, categories |
| `debts` | Owed/Receivable debts with auto_deduct, payment_day, multi-currency |
| `debt_payments` | Payment history linked to debts |
| `investments` | Portfolio: symbol, shares, prices, halal flag, currency |
| `investment_transactions` | Buy/sell history with commission |
| `budgets` | Monthly category limits (unique per user/category/month/year) |
| `alerts` | User notifications with trigger_condition JSONB, scheduled_for |
| `savings_goals` | Target savings with progress tracking |
| `zakat_history` | Annual zakat: gold, silver, cash, investments, debts |
| `notification_preferences` | Push/email settings: quiet hours, content masking |
| `user_byok_keys` | Encrypted AI API keys (envelope encryption) |

## Request Lifecycle Examples

### Server Component Query
```
Server Component → createServerClient() → Supabase RPC → PostgreSQL (RLS) → Typed Response
```

### Mutation (API Route)
```
Client Action → API Route → createServerClient() → Supabase Mutation → Realtime Broadcast → UI Update
```

### Push Notification
```
Trigger (Cron/Webhook) → Edge Function → FCM (mobile) + Web Push (browser)
```

## Where to Look for Common Tasks

| Task | Location |
|------|----------|
| Add dashboard widget | `components/dashboard/` |
| Add transaction feature | `app/(dashboard)/dashboard/transactions/` + `components/transactions/` |
| Add API endpoint | `app/api/` (new folder + route.ts) |
| Add database table | `supabase/migrations/` (new numbered .sql) |
| Add RPC function | `supabase/migrations/` |
| Add mobile screen | `mobile/fajrak_flutter/lib/` |
| Add i18n text | `lib/locales/en/*.ts` + `lib/locales/ar/*.ts` (same keys) |
| Add push trigger | `supabase/functions/push-notification/index.ts` |
| Add AI tool (MCP) | `lib/unified-tools/index.ts` |
| Add unit test | `__tests__/` mirroring source path |
| Add E2E test | `e2e/` (Page Object Model) |

---

## Enhanced Sections (Added by codebase-onboarding)

### Data Flow Details
- **Auth Flow**: User → Next.js Server Component → Supabase Auth (PKCE) → JWT in HttpOnly Cookie → RLS Policies Enforced
- **Server Components** read session via `createServerClient()`; client components use `createBrowserClient()`
- **Mutations** use API Routes with server-side Supabase client
- **Admin client** (service role) used only for system operations after auth verification
- **Realtime** pushes changes to subscribed clients (web + mobile) via WebSocket

### Critical Rules (Do Not Break)
1. Never bypass RLS — All queries must respect `auth.uid() = user_id`
2. Never hardcode user-facing strings — Always use `lib/locales/{en,ar}/`
3. Never log BYOK keys — Envelope encryption only; keys stored encrypted
4. Server Components by default — Add `'use client'` only when required
5. Admin client only for system operations — Crons, webhooks, migrations
6. Test multi-currency flows — Exchange rates, original_amount/original_currency fields
7. Respect quiet hours — Check `notification_preferences` before sending pushes

### Naming Conventions
- Components: PascalCase (`HeroBalanceCard.tsx`)
- Hooks: camelCase + `use` prefix (`useTransactions.ts`)
- API Routes: kebab-case folders (`app/api/auto-recurring/route.ts`)
- DB Migrations: Numbered + snake_case (`042_emergency_performance_idx.sql`)
- Types: PascalCase interfaces (`Transaction`, `DebtSummary`)
- Locale keys: camelCase nested (`dashboard.cards.netWorth`)

### Git Workflow
- Commits: Conventional-ish (`feat:`, `fix:`, `refactor:`, `chore:`)
- Branches: `feature/`, `fix/`, `chore/` prefixes
- PRs: Squash merge to main (typical for Vercel deployments)

### Key Files Reference
- `types/index.ts` — Single source of truth for all TypeScript interfaces
- `lib/supabase/client.ts` — Browser Supabase client (client components)
- `lib/supabase/server.ts` — Server Supabase client (Server Components, API routes)
- `lib/supabase/admin.ts` — Service-role client (crons, webhooks — use sparingly)
- `lib/i18n.tsx` / `lib/i18n-server.ts` — i18n provider + server-side locale detection
- `lib/byok/vault.ts` — Encrypted key storage for BYOK
- `supabase/migrations/legacy/001_initial.sql` — Baseline schema
- `components/ui/toast.tsx` — Toast notification system (Sonner)