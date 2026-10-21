# Fajrak Repository Index

> **Generated:** 2026-10-20  
> **Purpose:** Complete map of the Fajrak project for external AI architects who cannot see local files  
> **Scope:** Every directory, key file, and subsystem — including "unseen" modules not discussed in recent chats

---

## 1. Directory Structure (High-Level)

```
financetracker/
├── app/                    # Next.js 16 App Router (Web Frontend + API Routes)
├── components/             # React UI Components (Web)
├── lib/                    # Shared TypeScript Logic (Web + BYOK + MCP)
├── mobile/
│   └── fajrak_flutter/    # Flutter Mobile App (iOS/Android)
├── supabase/               # Database + Edge Functions
│   ├── migrations/         # 60+ SQL migrations (legacy + current)
│   └── functions/          # Deno Edge Functions (push notifications)
├── observability/          # OTel, Grafana dashboards, alerts, runbooks
├── docs/                   # Project documentation (PRDs, audit reports, plans, agent lessons)
├── scripts/                # Build/CI helper scripts
├── .github/workflows/      # CI/CD pipelines
├── e2e/                    # Playwright E2E tests
├── __tests__/              # Jest unit/integration tests
├── types/                  # Shared TypeScript types
├── templates/              # Email/HTML templates
├── secure_configs/         # Local encrypted config (gitignored)
└── docs/REPO_INDEX.md      # THIS FILE
```

---

## 2. `app/` — Next.js 16 App Router (Web Frontend + API)

### 2.1 Route Groups & Pages

| Path | Purpose |
|------|---------|
| `app/page.tsx` | Landing page (marketing) |
| `app/layout.tsx` | Root layout (providers, fonts, SEO) |
| `app/global-error.tsx` | Global error boundary |
| `app/not-found.tsx` | 404 page |
| `app/sitemap.ts` | Dynamic sitemap generation |
| `app/robots.ts` | Robots.txt generation |
| `app/download/` | PWA install page |
| `app/help/` | Help center |
| `app/privacy/` | Privacy policy |
| `app/terms/` | Terms of service |

#### Auth Group: `app/(auth)/`
| File | Purpose |
|------|---------|
| `layout.tsx` | Auth layout (no sidebar) |
| `login/page.tsx` + `login-client.tsx` | Email/password login |
| `register/page.tsx` + `register-client.tsx` | Account registration |
| `onboarding/page.tsx` | Multi-step onboarding (income, payday, currency) |
| `forgot-password/page.tsx` | Password reset request |
| `reset-password/page.tsx` + `actions.ts` | Password reset confirmation |
| `auth-confirm/route.ts` | Supabase email confirmation callback |

#### Dashboard Group: `app/(dashboard)/`
| File | Purpose |
|------|---------|
| `layout.tsx` | Dashboard layout (sidebar, header, auth guard) |
| `dashboard-shell.tsx` | Shell with navigation + outlet |
| `dashboard/page.tsx` | Main dashboard (Hero balance, stats, charts, quick-add) |
| `dashboard/loading.tsx` | Loading skeleton |
| `dashboard/transactions/page.tsx` | Transaction list + filters + CSV export |
| `dashboard/budgets/page.tsx` | Budget management (50/30/20 rule, insights) |
| `dashboard/debts/page.tsx` | Debt tracker (snowball, auto-deduct, celebrations) |
| `dashboard/debts/_components/DebtCard.tsx` | Individual debt card |
| `dashboard/debts/_components/DebtForm.tsx` | Add/edit debt modal |
| `dashboard/investments/page.tsx` | Portfolio (live prices, halal tags, P&L) |
| `dashboard/goals/page.tsx` | Savings goals (progress rings, add savings) |
| `dashboard/alerts/page.tsx` | Alerts list (AI-generated, filterable) |
| `dashboard/alerts/loading.tsx` | Alerts loading skeleton |
| `dashboard/settings/page.tsx` | User settings (profile, API keys, BYOK, theme, export) |
| `dashboard/settings/loading.tsx` | Settings loading skeleton |
| `dashboard/learn/page.tsx` | Daily financial lessons (stages, streak) |
| `dashboard/learn/loading.tsx` | Learn loading skeleton |
| `dashboard/help/page.tsx` | Help center (FAQs by feature) |
| `dashboard/accounts/page.tsx` | Bank/cash accounts + transfers |
| `dashboard/zakat/page.tsx` | Zakat calculator (gold/silver/cash, haul dates) |
| `dashboard/fire/page.tsx` | FIRE calculator (Lean/Normal/Fat modes) |
| `dashboard/chat/page.tsx` | AI Chat (BYOK, streaming, financial context) |
| `dashboard/pdf-report/page.tsx` | Monthly PDF report generator |

---

### 2.2 API Routes: `app/api/`

> **All routes are dynamic (Server Components / Route Handlers).**  
> **Auth:** Most use Supabase SSR cookies via `@supabase/ssr`.  
> **Rate limiting:** `lib/rate-limit.ts` (per-user, per-minute).  
> **Audit logging:** `lib/unified-tools/writeAuditLog` → `api_audit_log` table.

| Route | Method | Purpose |
|-------|--------|---------|
| `api/alerts/route.ts` | GET, POST | Generate AI alerts, list user alerts |
| `api/auth/callback/route.ts` | GET | Supabase OAuth callback |
| `api/auto-debt/route.ts` | POST | Cron: auto-deduct debt installments |
| `api/auto-recurring/route.ts` | POST | Cron: process recurring transactions |
| `api/auto-salary/route.ts` | POST | Cron: auto-record salary income |
| `api/budget-alerts/route.ts` | POST | Cron: check budget thresholds, create alerts |
| `api/byok/proxy/route.ts` | POST | **Feature A** — Thin LLM proxy (SSRF-safe, client-encrypted keys) |
| `api/byok/config/route.ts` | GET, POST | Manage BYOK provider configs (user_api_keys table) |
| `api/confirm/route.ts` | POST | Confirm webhook transaction (manual debt payment) |
| `api/daily-reminder/route.ts` | POST | Cron: daily transaction reminder (7 PM) |
| `api/evening-reminder/route.ts` | POST | Cron: evening financial nudge |
| `api/exchange-rate/route.ts` | GET | Fetch live FX rates (JOD/USD) |
| `api/gamification/route.ts` | POST | Cron: update achievements, levels, badges |
| `api/health/route.ts` | GET | Health check (DB, Supabase, external APIs) |
| `api/health-score-snapshot/route.ts` | POST | Cron: snapshot financial health score history |
| `api/mcp/route.ts` | GET, POST, DELETE, OPTIONS | **Feature B** — MCP Server (3 tools, PAT auth, scope gates) |
| `api/new-user-nudge/route.ts` | POST | Cron: nudge inactive users |
| `api/push-send/route.ts` | POST | Send push notification (FCM + Web Push) |
| `api/push-subscribe/route.ts` | POST | Save push subscription (FCM token / VAPID) |
| `api/push-test/route.ts` | POST | Test push notification |
| `api/smart-notifications/route.ts` | POST | AI-generated smart notifications |
| `api/stock-price/route.ts` | GET | Fetch live stock/crypto prices |
| `api/streak-alert/route.ts` | POST | Cron: streak reminders |
| `api/weekly-report/route.ts` | POST | Cron: generate & email weekly report |
| `api/zakat/prices/route.ts` | GET | Live gold/silver prices for Zakat |
| `api/zakat-autopilot/route.ts` | POST | Cron: auto-calculate Zakat, create alerts |
| `api/zakat-reminder/route.ts` | POST | Cron: Zakat haul reminders |
| `api/api-keys/create/route.ts` | POST | Create PAT (Personal Access Token) |
| `api/api-keys/revoke/route.ts` | POST | Revoke PAT |
| `api/testimonials/route.ts` | GET, POST | Public testimonials (landing page) |

---

## 3. `components/` — React UI Components (Web)

| Path | Purpose |
|------|---------|
| `components/ui/` | Base UI primitives (Button, Modal, Toast, FormField, FAB, Skeleton, etc.) |
| `components/dashboard/` | Dashboard-specific widgets (HeroBalanceCard, Charts, GamificationCard, MonthSummaryBanner, ZakatHawlCard, ChallengesCard, NetWorthCard, ChatAssistant) |
| `components/settings/` | Settings sections (BYOKKeysSection, ApiKeysSection, sections.tsx) |
| `components/transactions/` | TransactionFormModal, TransactionItem, RecurringList, TransactionFilters |
| `components/investments/` | WealthSimulator |
| `components/landing/` | Marketing landing page sections (Hero, Features, Problem, Journey, Testimonials, Pricing, Navbar, Footer) |
| `components/layout/` | Sidebar, LandingClient |
| `components/providers/` | QueryProvider (TanStack Query) |
| `components/seo/` | JsonLd (structured data) |

---

## 4. `lib/` — Shared TypeScript Logic (Web + BYOK + MCP)

| File | Purpose |
|------|---------|
| `lib/supabase/client.ts` | Browser Supabase client (SSR cookies) |
| `lib/supabase/server.ts` | Server Supabase client (RSC, route handlers) |
| `lib/supabase/admin.ts` | Service-role client (admin operations, cron, webhooks) |
| `lib/byok/providers.ts` | **Feature A Config** — 7 LLM providers (SSRF allowlist, auth styles, models) |
| `lib/byok/client.ts` | Client-side BYOK chat (encrypts keys, calls proxy) |
| `lib/byok/vault.ts` | Web Crypto API encryption (AES-GCM, PBKDF2) for BYOK keys |
| `lib/byok/envelope.ts` | Key envelope format (encrypted key + salt + iv + version) |
| `lib/byok/chat.ts` | Chat message types, streaming SSE parsing |
| `lib/byok/system-prompt.ts` | Financial system prompt (injected with user context) |
| `lib/byok/crypto-utils.ts` | Low-level Web Crypto helpers |
| `lib/byok/key-rotation.ts` | Key rotation logic (re-encrypt on password change) |
| `lib/byok/types.ts` | BYOK TypeScript interfaces |
| `lib/unified-tools/index.ts` | **Shared RPC layer** — getAccountBalances, getCashflowSummary, createTransaction, idempotency, audit logging, category validation (used by BYOK proxy + MCP) |
| `lib/api-keys.ts` | PAT verification, scopes, rate limits (`fjk_live_…`) |
| `lib/rate-limit.ts` | In-memory + Redis-compatible rate limiter (sliding window) |
| `lib/push-send.ts` | Server-side push (FCM + Web Push VAPID) |
| `lib/currency.ts` | Currency formatting, conversion, JOD/USD |
| `lib/currencies.ts` | Supported currencies list |
| `lib/detectCurrency.ts` | Auto-detect user currency from locale |
| `lib/timezone.ts` | User timezone utilities |
| `lib/i18n.tsx` + `lib/i18n-server.ts` | Client + server i18n (easy-localization, 2 locales: en/ar) |
| `lib/locales/en/` + `lib/locales/ar/` | Per-feature translation files (dashboard, debts, alerts, chat, etc.) |
| `lib/theme-context.tsx` | Theme provider (light/dark/system) |
| `lib/use-push.ts` | Hook: request push permission, subscribe |
| `lib/use-cached-data.ts` | Hook: SWR-style cached fetches |
| `lib/cache.ts` | In-memory cache with TTL |
| `lib/insight-alerts.ts` | Budget/debt insight alert generation logic |
| `lib/daily-lessons.ts` | Lesson content by financial stage |
| `lib/firebase.ts` | Firebase Admin init (FCM token minting) |
| `lib/cron-auth.ts` | Verify cron job secrets (X-Cron-Secret header) |
| `lib/errors/error-rescue-map.ts` | User-friendly error messages for known failures |
| `lib/seo.ts` | SEO metadata helpers |
| `lib/moderation/index.ts` | Content moderation (future) |
| `lib/haptic.ts` | Web haptic feedback (PWA) |
| `lib/use-swipe-delete.ts` | Hook: swipe-to-delete gesture |
| `lib/use-count-up.ts` | Hook: animated number counting |
| `lib/use-pull-to-refresh.ts` | Hook: pull-to-refresh (mobile web) |

---

## 5. `mobile/fajrak_flutter/` — Flutter Mobile App

### 5.1 App Entry & State

| File | Purpose |
|------|---------|
| `lib/main.dart` | App entry, providers, routes, Supabase init, FCM |
| `lib/app_state.dart` | Global ChangeNotifier (theme, language, unread alerts, transaction version) |
| `lib/firebase_options.dart` | Generated Firebase config (Android/iOS/Web) |

### 5.2 Screens (`lib/screens/`)

| Screen | Purpose |
|--------|---------|
| `splash_screen.dart` | Animated splash, auto-login check |
| `main_screen.dart` | Bottom nav shell (5 tabs) |
| `dashboard/dashboard_screen.dart` | Mobile dashboard (mirrors web) |
| `transactions/transactions_screen.dart` | Transaction list + quick add |
| `transactions/recurring_screen.dart` | Recurring transaction rules |
| `budgets/budgets_screen.dart` | Budget management |
| `debts/debts_screen.dart` | Debt tracker (owed + receivable tabs) |
| `investments/investments_screen.dart` | Portfolio + add investment |
| `goals/goals_screen.dart` | Savings goals |
| `alerts/alerts_screen.dart` | **REFACTORED** — Alerts list (swipe delete, action buttons, compact AI banner, FAB) |
| `chat/chat_screen.dart` | BYOK AI Chat (provider/model selector, streaming) |
| `chat/message_bubble.dart` | Chat message widget |
| `achievements/achievements_screen.dart` | Badges, levels, progress |
| `learn/learn_screen.dart` | Daily lessons + roadmap |
| `more/more_screen.dart` | Settings, Zakat, FIRE, Help, About |
| `more/zakat_calculator_screen.dart` | Zakat calculator (gold/silver/cash, haul) |
| `more/fire_calculator_screen.dart` | FIRE calculator |
| `accounts/accounts_screen.dart` | Accounts + transfers |
| `settings/settings_screen.dart` | Profile, API keys, BYOK keys, theme, export, danger zone |
| `settings/notification_settings_screen.dart` | Push notification preferences |
| `auth/login_screen.dart` | Login |
| `auth/register_screen.dart` | Register |
| `auth/onboarding_screen.dart` | Onboarding flow |
| `auth/forgot_password_screen.dart` | Forgot password |
| `auth/reset_password_screen.dart` | Reset password |

### 5.3 Widgets (`lib/widgets/`)

| Category | Key Widgets |
|----------|-------------|
| `alerts/` | `AlertListItem` (Dismissible, action buttons), `AlertFilterTabs` (badges), `AlertHeader` (unread only), `AlertActions` (popup menu), `AIGeneratorCard` (compact banner + FAB variant) |
| `dashboard/` | 20+ widgets (HeroBalanceCard, QuickAdd, ChartsCard, GamificationCard, ZakatHawlCard, WealthSimulatorCard, etc.) |
| `transactions/` | TransactionListItem, AddTransactionDialog, TransactionFilters, TransactionSummary |
| `budgets/` | BudgetListItem, BudgetRuleCard, AddBudgetDialog, FinancialAdvisorCard |
| `investments/` | InvestmentListItem, PortfolioChartCard, AddInvestmentDialog, WealthSimulatorCard |
| `debts/` | DebtListItem, PaidDebtItem, AddDebtDialog, DebtCelebrationDialog |
| `goals/` | GoalListItem, AddGoalDialog, AddAmountDialog, OverallProgressCard |
| `achievements/` | BadgeGrid, LevelCard |
| `settings/` | ByokKeysSection, ApiKeysSection, TestimonialCard, ExportDeleteSection |
| `common/` | GlassPanel, SkeletonLoader, ConfirmDialog, CurrencyPickerSheet, CalculatorDisclaimer |
| `main_screen/` | MainBottomNavBar, NavItemWidget |

### 5.4 Services (`lib/services/`)

| Service | Purpose |
|---------|---------|
| `notification_service.dart` | FCM + Flutter Local Notifications (3 channels: budget, debt, goals) |
| `analytics_service.dart` | Event tracking (screen views, actions) |
| `finance_service.dart` | Core finance logic (balances, summaries, insights) |
| `sync_service.dart` | Offline-first sync (Drift → Supabase) |
| `currency_service.dart` | FX rates, formatting |
| `investments_service.dart` | Portfolio, live prices, P&L |
| `pdf_report_service.dart` | Monthly PDF generation |
| `llm_service.dart` | BYOK chat client (proxy + direct) |
| `byok/` | `byok_service.dart`, `chat.dart`, `envelope.dart`, `providers.dart`, `vault.dart`, `key_save_error.dart`, `prompt_rules.dart` |
| `repositories/transaction_repository.dart` | Drift transaction CRUD |
| `sentry_service.dart` | Error reporting |

### 5.5 Database (`lib/database/`)

| File | Purpose |
|------|---------|
| `app_database.dart` | Drift database (tables: transactions, accounts, debts, investments, goals, alerts, recurring, sync_queue) |
| `app_database.g.dart` | Generated Drift code (gitignored, built at CI) |
| `connection/web.dart` | WASM SQLite (web) |
| `connection/native.dart` | sqlite3_flutter_libs (mobile/desktop) |
| `connection/unsupported.dart` | Fallback |

### 5.6 Models & Utils

| File | Purpose |
|------|---------|
| `lib/models/notification_settings.dart` | NotificationPreference, categories |
| `lib/utils/app_colors.dart` | Material 3 color palette (light/dark) |
| `lib/utils/finance_utils.dart` | Financial calculations (health score, 50/30/20, Zakat) |
| `lib/utils/level_ladder.dart` | Gamification levels (6 levels, XP thresholds) |
| `lib/utils/date_formatter.dart` | Arabic/English date formatting |
| `lib/utils/error_handler.dart` | Centralized error handling (Sentry + user toast) |
| `lib/utils/exceptions.dart` | Custom exception classes |
| `lib/utils/detect_currency.dart` | Currency detection |
| `lib/core/theme/` | AppTheme, AppTypography, AppColors, AppRadius, AppSpacing |

---

## 6. `supabase/` — Database & Edge Functions

### 6.1 Migrations (`supabase/migrations/`)

**Legacy (41 migrations, 001–041):** Initial schema, RLS, indexes, functions  
**Current (12+ migrations, dated):** Performance, security, new features

| Migration | Purpose |
|-----------|---------|
| `001_initial.sql` | Core tables: profiles, transactions, accounts, debts, budgets, goals, investments, alerts |
| `008_push_subscriptions.sql` | Push subscription table (FCM + Web Push) |
| `014_recurring_transactions.sql` | Recurring transaction rules |
| `019_accounts.sql` | Bank/cash accounts |
| `023_notification_system_upgrade.sql` | Notification preferences, history |
| `035_dashboard_rpc_consolidate.sql` | Optimized RPCs for dashboard |
| `039_user_api_keys.sql` | PAT table (api_keys, scopes, rate limits) |
| `040_proxy_usage.sql` | BYOK proxy usage tracking (30 req/min) |
| `042_emergency_performance_idx.sql` | Critical indexes |
| `043_user_byok_keys.sql` | BYOK encrypted keys table |
| `047_pat_expiration.sql` | PAT expiry + rotation |
| `048_idempotency_keys.sql` | Idempotency keys table (MCP) |
| `20260907081557_advisor_function_lockdown.sql` | SECURITY DEFINER lockdown |
| `20260907215119_advisor_fk_indexes.sql` | FK indexes for advisor RPCs |
| `20260913135653_add_prod_only_schema.sql` | Production-only schema objects |
| `20261016114425_restore_sync_and_health_rpcs.sql` | Restore sync/health RPCs |
| `20261017000000_dashboard_health_score_fix.sql` | Health score calculation fix |
| `20261017160000_zero_budget_trigger_guard.sql` | Zero-budget trigger guard |
| `20261018000000_linter_security_hardening.sql` | Security hardening |
| `20261019000000_zakat_engine_v2.sql` | Zakat engine v2 (haul dates, auto-fetch) |
| `20261021000000_zakat_autopilot.sql` | Zakat autopilot (cron + alerts) |

**Test Fixtures:** `supabase/tests/zakat_*.sql` — Unit tests for Zakat engine (pgTAP)

### 6.2 Edge Functions (`supabase/functions/`)

| Function | Purpose |
|----------|---------|
| `push-notification/index.ts` | **Deno Edge Function** — Triggered by `notification_history` INSERT. Checks user preferences (quiet hours, masking), sends FCM (Android) + Web Push (VAPID), writes to `alerts` table for in-app display. Handles token cleanup (410/UNREGISTERED). |

---

## 7. `observability/` — Production Observability Stack

| Path | Purpose |
|------|---------|
| `observability/otel/index.ts` | OpenTelemetry SDK init (Node) — traces, metrics, OTLP HTTP exporter |
| `observability/dashboards/` | Grafana JSON dashboards: `byok-proxy.json`, `mcp-server.json`, `crypto-rate-limits.json` |
| `observability/alerts/` | Prometheus/Alertmanager rules: `byok-proxy-alerts.json`, `mcp-server-alerts.json`, `crypto-rate-limit-alerts.json` |
| `observability/runbooks/` | Incident runbooks (Markdown):<br>`byok-proxy-high-errors.md`, `byok-proxy-high-latency.md`, `byok-proxy-sse-stalled.md`, `byok-proxy-rate-limit-spike.md`, `crypto-envelope-errors.md`, `crypto-unwrap-failures.md`, `mcp-pat-auth-failures.md`, `mcp-scope-violations.md`, `mcp-tool-high-errors.md`, `mcp-tool-high-latency.md`, `pat-rate-limit-capacity.md`, `proxy-rate-limit-capacity.md` |

---

## 8. `scripts/` — Build & CI Helpers

| Script | Purpose |
|--------|---------|
| `scripts/extract_i18n.js` | Extract translation keys from source → JSON |
| `scripts/replace_translations.py` | Bulk replace translation keys (refactoring) |
| `scripts/migrate-admin-client.js` | Migrate admin client usage patterns |
| `scripts/e2e-dev-server.js` | Start dev server for Playwright E2E |

---

## 9. `.github/workflows/` — CI/CD

| Workflow | Trigger | Jobs |
|----------|---------|------|
| `lint-test-build.yml` | Push/PR to main | **web**: lint, typecheck, test, build<br>**mobile**: flutter analyze, test (Drift codegen) |
| `supabase-validate.yml` | Push/PR | `supabase db lint`, migration squash check |
| `supabase-backup.yml` | Schedule (daily) | `supabase db dump` → artifact |
| `smart-notifications.yml` | Schedule (daily 7 AM) | Trigger `api/smart-notifications` cron |

---

## 10. Key Config Files

| File | Purpose |
|------|---------|
| `package.json` | Node deps (Next.js 16, React 19, Supabase, TanStack Query, OpenTelemetry, Sentry, MCP SDK, Zod, Firebase, Web Push) |
| `next.config.mjs` | Next.js config (Sentry, headers, turbopack, security headers) |
| `tsconfig.json` | TypeScript base config |
| `tsconfig.typecheck.json` | Strict typecheck config (CI) |
| `tailwind.config.js` | Tailwind CSS v3 config |
| `supabase/config.toml` | Local Supabase config (ports, auth, realtime, storage, edge runtime) |
| `vercel.json` | Vercel deploy config (crons, headers) |
| `playwright.config.ts` | E2E test config |
| `jest.config.js` | Unit test config (jsdom, ts-jest) |
| `.env.example` | Template for all required env vars |
| `mobile/fajrak_flutter/pubspec.yaml` | Flutter deps (Provider, Supabase, Firebase, Drift, SQLCipher, Local Notifications, PDF, BYOK) |

---

## 11. Hidden / Unusual Files

| File | Purpose |
|------|---------|
| `.env.example` | 40+ env vars (Supabase, Firebase, VAPID, Sentry, OpenAI, NVIDIA, etc.) |
| `.env.local` | Local dev secrets (gitignored) |
| `.env.e2e` | E2E test secrets |
| `secure_configs/` | Encrypted local configs (SOPS/age, gitignored) |
| `skills-lock.json` | Hermes Agent skill version lockfile |
| `.claude/` | Claude Code agents, commands, hooks, skills (100+ files) |
| `.agents/` | Custom agent skills (Dart, Flutter, Next.js, Supabase, Tailwind) |
| `.taskmaster/` | Task Master AI project management |
| `.planning/` | Codebase analysis outputs (architecture, patterns, concerns) |
| `DESIGN.md` | Design system specification (colors, typography, components) |
| `ARCHITECTURE.md` | System architecture diagram + decisions |
| `PRODUCT.md` | Product vision & roadmap |
| `VISION.md` | Long-term vision |
| `CHANGELOG.md` | Version history (v3.x) |
| `README.ar.md` | Arabic README (full) |
| `README.md` | English README (brief) |
| `CONFIGURATION.md` | Configuration guide |
| `SECURITY.md` | Security policy |
| `RISK_REGISTER.md` | Risk register |
| `ZAKAT_AUDIT_REPORT.md` | Zakat calculation audit |
| `FAJRAK_ACCOUNTING_ANALYSIS.md` | Accounting logic deep-dive |
| `AUDIT_REPORT.md` | Code audit report |
| `DEEP_PROJECT_ANALYSIS.md` | Full project analysis |
| `HANDOFF_REPORT.md` | Team handoff document |
| `AI_ASSISTANT_AUDIT.md` | AI assistant audit |
| `API_DOCS.md` | API documentation |
| `BCP.ar.md` | Business continuity plan (Arabic) |
| `MONTHLY_REPORT_GUIDE.md` | Monthly report generation guide |
| `AGENTIC_AI_PLAN.md` | Agentic AI roadmap |
| `STORYBOARD.md` | User journey storyboard |

---

## 12. "Unseen" Subsystems (Not Discussed in Recent Chat)

### 12.1 BYOK (Bring Your Own Key) — Feature A
- **Proxy:** `app/api/byok/proxy/route.ts` — Thin pass-through, never parses body, SSRF-safe allowlist (`lib/byok/providers.ts`)
- **Client Encryption:** `lib/byok/vault.ts` — AES-GCM + PBKDF2 (100k iterations), keys never leave browser
- **Key Storage:** `user_byok_keys` table (encrypted envelope), `lib/byok/envelope.ts` format
- **Providers:** OpenAI, Anthropic, NVIDIA NIM, OpenRouter, Gemini, Ollama (local, `clientDirect`)
- **Rate Limit:** 30 req/min per user via `bump_proxy_usage` RPC + `api_audit_log`
- **Mobile Sync:** `mobile/fajrak_flutter/lib/services/byok/providers.dart` (mirrors TS config)

### 12.2 MCP Server — Feature B
- **Route:** `app/api/mcp/route.ts` — Streamable HTTP (MCP SDK v2)
- **Auth:** PAT (`fjk_live_…`) via `verifyApiKey`, scopes: `read_balances`, `read_transactions`, `create_transaction`
- **Tools:** `get_balances`, `get_cashflow_summary`, `create_transaction` (idempotency keys)
- **Scope Gate:** HTTP-level 403 before tool execution (PRD §5.4)
- **Audit:** Every tool call → `api_audit_log`
- **Shared Logic:** `lib/unified-tools/index.ts` (used by BYOK proxy + MCP)

### 12.3 Push Notification Pipeline
1. Cron/API inserts into `notification_history` table
2. Supabase DB webhook → `supabase/functions/push-notification` (Deno)
3. Function checks `notification_preferences` (quiet hours, masking)
4. Sends **FCM** (Android) + **Web Push** (VAPID, Chrome/Safari/Edge)
5. Writes to `alerts` table for in-app display
6. Cleans invalid tokens (410/UNREGISTERED)

### 12.4 Zakat Engine v2
- **Migrations:** `20261019000000_zakat_engine_v2.sql`, `20261021000000_zakat_autopilot.sql`
- **RPCs:** `calculate_zakat_v2`, `get_zakat_haul_dates`, `zakat_autopilot`
- **Cron:** Daily autopilot → auto-calculate, create alerts
- **Tests:** `supabase/tests/zakat_*.sql` (pgTAP)

### 12.5 Offline-First Mobile (Drift + SQLCipher)
- **Local DB:** Drift (SQLite) with SQLCipher encryption
- **Sync Queue:** `sync_queue` table → background sync to Supabase
- **Conflict Resolution:** Last-write-wins + server timestamp
- **Platform Channels:** Web (WASM SQLite) vs Native (sqlite3_flutter_libs)

### 12.6 Gamification System
- **Levels:** 6 levels (Novice → Financial Freedom), XP from actions
- **Badges:** 20+ badges (First Transaction, Debt Free, Halal Investor, etc.)
- **Streaks:** Daily lesson streak, transaction logging streak
- **Cron:** `api/gamification/route.ts` recalculates nightly

### 12.7 Financial Health Score
- **5 Factors:** Savings rate, Debt ratio, Emergency fund, Investment consistency, Tracking consistency
- **Score:** 0–100, staged (Awareness → Control → Reserve → Building → Freedom)
- **Snapshot:** `api/health-score-snapshot/route.ts` daily cron

### 12.8 Multi-Currency + Exchange Rates
- **Base:** JOD (Jordanian Dinar)
- **Supported:** JOD, USD (crypto/stocks in USD)
- **Live Rates:** `api/exchange-rate/route.ts` (cron + on-demand)
- **Conversion:** All amounts stored in base currency + original currency

### 12.9 Observability Stack (Production)
- **Traces/Metrics:** OpenTelemetry → OTLP → Grafana Tempo/Prometheus
- **Errors:** Sentry (Next.js + Flutter)
- **Dashboards:** BYOK Proxy, MCP Server, Crypto Rate Limits
- **Alerts:** High error rate, high latency, SSE stalled, rate limit spikes, PAT auth failures, scope violations
- **Runbooks:** 11 detailed incident response guides

---

## 13. Data Flow Summary

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Web App   │────▶│  Next.js API │────▶│   Supabase DB   │
│  (Next.js)  │     │  (Route Hnd) │     │  (PostgreSQL)   │
└─────────────┘     └──────┬───────┘     └────────┬────────┘
                           │                      │
              ┌────────────┴────────────┐         │
              ▼                         ▼         ▼
       ┌─────────────┐          ┌─────────────┐ ┌─────────┐
       │  BYOK Proxy │          │ MCP Server  │ │  Cron   │
       │ (Feature A) │          │ (Feature B) │ │  Jobs   │
       └──────┬──────┘          └──────┬──────┘ └────┬────┘
              │                        │             │
              └────────────┬───────────┘             │
                           ▼                         ▼
                    ┌─────────────────┐      ┌──────────────┐
                    │ lib/unified-    │      │ Supabase     │
                    │ tools (shared)  │      │ Edge Funcs   │
                    └─────────────────┘      │ (Push Notif) │
                                            └──────────────┘
                                                     │
                    ┌────────────────────────────────┘
                    ▼
            ┌───────────────┐
            │ Mobile App    │
            │ (Flutter)     │
            └───────┬───────┘
                    │
         ┌──────────┴──────────┐
         ▼                     ▼
   ┌──────────┐          ┌──────────┐
   │  FCM     │          │ Web Push │
   │ (Android)│          │ (VAPID)  │
   └──────────┘          └──────────┘
```

---

## 14. Environment Variables (from `.env.example`)

| Category | Variables |
|----------|-----------|
| **Supabase** | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Auth** | `SUPABASE_JWT_SECRET`, `NEXT_PUBLIC_SUPABASE_URL` |
| **Firebase/FCM** | `FIREBASE_SERVICE_ACCOUNT_KEY`, `NEXT_PUBLIC_FIREBASE_*` |
| **VAPID (Web Push)** | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL` |
| **Sentry** | `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` |
| **BYOK Providers** | `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `NVIDIA_NIM_API_KEY`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY` |
| **External APIs** | `ALPHA_VANTAGE_API_KEY` (stocks), `EXCHANGE_RATE_API_KEY` (FX), `GOLD_API_KEY` (Zakat) |
| **Cron Secrets** | `CRON_SECRET`, `SMART_NOTIFICATIONS_SECRET`, `ZAKAT_AUTOPILOT_SECRET` |
| **OTel** | `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_EXPORTER_OTLP_HEADERS` |
| **App** | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_APP_NAME` |

---

## 15. Version & Deployment

| Artifact | Version/Info |
|----------|--------------|
| **Web** | Next.js 16.3.5, React 19.2.4, TypeScript 5.x |
| **Mobile** | Flutter 3.47.6, Dart 3.6, Drift 2.18, SQLCipher |
| **Supabase** | PostgreSQL 17, PostgREST, Realtime, Storage, Edge Runtime (Deno 2) |
| **Deploy** | Vercel (web), Play Store / TestFlight (mobile) |
| **CI** | GitHub Actions (lint, typecheck, test, build, flutter analyze) |
| **Current Version** | `VERSION` file: `3.45.0+64` (mobile), `3.42.0` (web) |

---

## 16. Quick Reference: Key Entry Points

| Task | Entry Point |
|------|-------------|
| Run web dev | `npm run dev` (port 3000) |
| Run mobile dev | `cd mobile/fajrak_flutter && flutter run` |
| Typecheck | `npm run typecheck` |
| Lint | `npm run lint` |
| Test (web) | `npm run test` |
| Test (mobile) | `cd mobile/fajrak_flutter && flutter test` |
| E2E | `npm run test:e2e` |
| Supabase local | `supabase start` (ports 54321-54327) |
| Deploy web | `vercel --prod` |
| Deploy mobile | `flutter build apk/ipa` + store upload |
| Generate Drift code | `dart run build_runner build --delete-conflicting-outputs` |

---

*End of Repository Index*  
*For questions about specific subsystems, refer to the source files listed above.*