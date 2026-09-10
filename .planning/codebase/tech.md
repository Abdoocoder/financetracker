# Tech Stack — Fajrak (FinanceTracker)

## Runtime & Build
- **Node.js**: 26.8.2
- **Package manager**: npm 11.19.1
- **Next.js**: 16.3.4 (App Router, Turbopack dev, standalone output)
- **TypeScript**: 5.9.3 (strict mode, ES2022 target, bundler resolution)
- **React**: 19.2.8 (React 19 with Server Components + Client Components)
- **Build target**: `node: 'es2022'` (standalone output, images unoptimized for self-hosting)

## Frontend
- **Styling**: Tailwind CSS (CSS Variables-based theming: `--text-primary`, `--bg-card`, `--accent-blue`, etc.)
- **Dark mode**: System preference + localStorage toggle (inline script prevents FOUC)
- **Font**: Cairo (Google Fonts, Arabic+Latin subsets, CSS variable `--font-cairo`)
- **Icons**: Emoji-based (no icon library)
- **Charts**: Recharts 3.8 (dynamic import, SSR disabled)
- **Forms**: Native React state (no form library)
- **Validation**: Zod 4.4.3 (API routes only; client forms use manual validation)
- **Toasts**: Custom `ToastProvider` component
- **Modals**: Custom `ConfirmDialog` component
- **RTL**: Full RTL support via `dir="ar"` on `<html>`, CSS variables switch per lang

## Data Layer
- **Database**: Supabase (PostgreSQL) with Row Level Security (RLS) on ALL tables
- **Auth**: Supabase Auth (email/password, PKCE flow, `onAuthStateChange`)
- **Client types**:
  - `lib/supabase/client.ts` — Browser client (singleton via `createBrowserClient`)
  - `lib/supabase/server.ts` — Server client (optional `accessToken` override for server actions)
  - `lib/supabase/admin.ts` — Admin client (service role key, bypasses RLS, server-only)
- **State management**: TanStack React Query v5.96 (via `QueryProvider` wrapper)
- **Real-time**: Supabase Realtime (Postgres Changes on `alerts` table for live badge count)
- **Custom hooks** (all in `hooks/`):
  - `useAccounts` — account CRUD + balance calculation
  - `useTransactions` — transaction CRUD with pagination
  - `useFinancialSummary` — aggregated income/expenses/balance
  - `useDashboardData` — dashboard-specific aggregated data (React Query)
  - `useDashboardLayout` — card visibility preferences (localStorage)

## API Layer
- **28 API route groups** under `app/api/`:
  - `webhook/transaction` — External API (PAT-authenticated, Zod-validated)
  - `mcp` — Model Context Protocol server (Streamable HTTP, PAT-authenticated)
  - `api-keys/create`, `api-keys/revoke` — API key management
  - `byok/` — BYOK AI chat proxy (envelope encryption)
  - `gamification` — Badge/points/streak calculation
  - `alerts`, `push-send`, `push-subscribe`, `push-test` — Notifications
  - `daily-reminder`, `evening-reminder`, `weekly-report`, `streak-alert`, `new-user-nudge`, `zakat-reminder` — Cron jobs
  - `exchange-rate`, `stock-price` — External data fetchers
  - `health`, `health-score-snapshot` — Health checks
  - `auto-debt`, `auto-recurring`, `auto-salary` — Automated financial operations
  - `budget-alerts`, `smart-notifications` — Smart alerting
  - `testimonials` — User testimonials
  - `zakat/`, `zakat/prices` — Zakat calculation
  - `confirm` — Email confirmation
  - `auth/callback` — OAuth callback

## Security
- **Cron auth**: `lib/cron-auth.ts` — timing-safe Bearer token verification (`CRON_SECRET`)
- **Rate limiting**: `lib/rate-limit.ts` — in-memory, per-IP sliding window (needs Redis for multi-region)
- **API keys**: `lib/api-keys.ts` — PAT system (`fjk_live_...`), HMAC-based, with audit logging
- **Input sanitization**: HTML tag stripping, dangerous char removal on user text
- **Security headers** (next.config.mjs):
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `X-DNS-Prefetch-Control: on`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- **BYOK encryption**: RSA-OAEP (SHA-256) + AES-256-GCM envelope encryption; private key in env only

## Observability
- **Error tracking**: Sentry (client + server configs, replays on errors, service worker noise filtered)
- **Analytics**: Vercel Speed Insights
- **Health endpoint**: `/api/health` returns `{ ok: true }`

## Mobile
- **Flutter app**: `mobile/fajrak_flutter/` — name: "Fajrak", version 3.40.0+51
- **Providers**: Supabase Flutter SDK, easy_localization, provider, flutter_riverpod

## Testing
- **Unit/Integration**: Jest 30.3 (jsdom, `@/` alias mapping)
- **E2E**: Playwright (Chromium only, global auth setup via Supabase PKCE, HTML reporter)
- **Flutter**: `flutter test` + `flutter analyze`
- **Doctor**: `npm run doctor` runs lint → typecheck → test:coverage → build sequentially

## Key npm Scripts
```
npm run dev            # Turbopack dev server
npm run build          # Production build (standalone)
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
npm run test           # Jest
npm run test:coverage  # Jest with coverage
npm run test:e2e       # Playwright
npm run doctor         # Full health check
```
