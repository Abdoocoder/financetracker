# Directory Structure — Fajrak

## Top-level layout
```
financetracker/
├── app/                      # Next.js App Router
│   ├── layout.tsx            # Root layout (providers, font, SW registration)
│   ├── globals.css           # Global styles + CSS variables
│   ├── page.tsx              # Landing page (public)
│   ├── (auth)/               # Auth route group
│   │   ├── login/page.tsx    # Email/password login
│   │   ├── register/page.tsx # Registration
│   │   ├── onboarding/       # Post-registration onboarding
│   │   └── forgot-password/  # Password reset
│   ├── (dashboard)/          # Dashboard route group (authenticated)
│   │   ├── layout.tsx        # Dashboard shell (Sidebar, Toast, ErrorBoundary, FAB)
│   │   └── dashboard/
│   │       ├── page.tsx      # Main dashboard (HeroBalance, charts, cards)
│   │       ├── accounts/     # Account management
│   │       ├── transactions/ # Transaction history + CRUD
│   │       ├── budgets/      # Budget tracking
│   │       ├── debts/        # Debt management
│   │       ├── investments/  # Investment portfolio
│   │       ├── goals/        # Savings goals
│   │       ├── alerts/       # Notifications center
│   │       ├── settings/     # User settings
│   │       ├── chat/         # AI chat assistant (BYOK)
│   │       ├── zakat/        # Zakat calculator
│   │       ├── fire/         # FIRE (Financial Independence) calculator
│   │       ├── pdf-report/   # PDF report generation
│   │       ├── learn/        # Financial lessons
│   │       └── help/         # Help/FAQ page
│   └── api/                  # 28 API route groups
│       ├── webhook/transaction/  # External API (PAT auth)
│       ├── mcp/                  # MCP server
│       ├── api-keys/             # Key management (create/revoke)
│       ├── byok/                 # BYOK AI chat
│       ├── gamification/         # Badges + points
│       ├── alerts/               # Alert CRUD
│       ├── push-*/               # Push notification endpoints
│       ├── *-reminder/           # Cron-triggered reminders
│       ├── exchange-rate/        # Currency rates
│       ├── stock-price/          # Stock data
│       ├── health/               # Health check
│       ├── health-score-snapshot/# Health score cron
│       ├── auto-*/               # Automated operations
│       ├── budget-alerts/        # Budget alert logic
│       ├── smart-notifications/  # Smart notification orchestrator
│       ├── zakat/                # Zakat calculation
│       ├── testimonials/         # Testimonials
│       ├── confirm/              # Email confirmation
│       └── auth/callback/        # OAuth callback
├── components/
│   ├── dashboard/            # Dashboard-specific components
│   │   ├── Cards.tsx         # MonthCompare, BudgetProgress, QuickLinks, Wealth, Recent
│   │   ├── HeroBalanceCard.tsx
│   │   ├── NetWorthCard.tsx
│   │   ├── Charts.tsx        # MiniBarChart, CategoryBars (dynamic)
│   │   ├── ChallengesCard.tsx
│   │   ├── GamificationCard.tsx
│   │   ├── DashboardCustomizer.tsx
│   │   ├── DashboardSkeleton.tsx
│   │   ├── MonthSummaryBanner.tsx
│   │   ├── Section.tsx
│   │   └── chat-assistant.tsx
│   ├── ui/                   # 24 reusable UI components
│   │   ├── skeleton.tsx, modal.tsx, toast.tsx, error-boundary.tsx
│   │   ├── confirm-dialog.tsx, form-field.tsx, empty-state.tsx
│   │   ├── quick-add.tsx, fab.tsx, stat-bar.tsx
│   │   ├── currency-picker.tsx, financial-health-combined.tsx
│   │   ├── push-prompt.tsx, push-toggle.tsx, install-prompt.tsx
│   │   ├── onboarding-tour.tsx, welcome-modal.tsx
│   │   └── ... (24 total)
│   ├── layout/               # Sidebar, Header
│   ├── landing/              # Landing page sections
│   ├── providers/            # QueryProvider (React Query wrapper)
│   ├── settings/             # Settings form components
│   └── transactions/         # Transaction form/list components
├── hooks/                    # 5 custom hooks
│   ├── useAccounts.ts
│   ├── useTransactions.ts
│   ├── useFinancialSummary.ts
│   ├── useDashboardData.ts
│   └── useDashboardLayout.ts
├── lib/
│   ├── supabase/             # 3 Supabase clients (admin, client, server)
│   ├── byok/                 # BYOK encryption (envelope, vault, chat, providers)
│   ├── locales/              # ar.ts, en.ts (i18n translations)
│   ├── i18n.tsx              # Client-side i18n context
│   ├── i18n-server.ts        # Server-side i18n helpers
│   ├── user-context.tsx      # User + Profile context provider
│   ├── theme-context.tsx     # Dark/light theme context
│   ├── currencies.ts         # 50+ currencies (Arabic, Islamic, Global groups)
│   ├── currency.ts           # Currency formatting utilities
│   ├── detectCurrency.ts     # Auto-detect user currency
│   ├── firebase.ts           # Firebase Admin SDK init
│   ├── push-send.ts          # Push notification delivery
│   ├── rate-limit.ts         # In-memory rate limiter
│   ├── cron-auth.ts          # Timing-safe cron secret verification
│   ├── api-keys.ts           # PAT verification + audit logging
│   ├── cache.ts              # Generic cache utility
│   ├── haptic.ts             # Haptic feedback (mobile)
│   ├── timezone.ts           # Timezone utilities
│   ├── daily-lessons.ts      # Financial lessons data
│   ├── use-cached-data.ts    # Cached data hook
│   ├── use-count-up.ts       # Animated counter hook
│   ├── use-pull-to-refresh.ts# Pull-to-refresh hook
│   ├── use-push.ts           # Push notification hook
│   └── use-swipe-delete.ts   # Swipe-to-delete hook
├── types/
│   └── index.ts              # All shared TypeScript types + category constants
├── __tests__/                # Jest test suites
│   ├── api/                  # API route tests (13 files)
│   ├── hooks/                # Hook tests (3 files)
│   ├── lib/                  # Library tests (14 files)
│   ├── types/                # Type tests (1 file)
│   └── helpers/
│       └── supabase-mock.ts  # Fluent query builder mock
├── e2e/                      # Playwright E2E tests
│   ├── smoke.spec.ts
│   ├── auth-flow.spec.ts
│   ├── transaction-management.spec.ts
│   └── setup/global-setup.ts # Auth setup (PKCE login)
├── mobile/fajrak_flutter/    # Flutter mobile app
├── supabase/migrations/      # SQL migrations
├── public/                   # Static assets (icons, manifest, SW files)
├── next.config.mjs           # Next.js config (Sentry, security headers)
├── tailwind.config.js        # Tailwind configuration
├── jest.config.js            # Jest configuration
├── playwright.config.ts      # Playwright configuration
├── sentry.client.config.ts   # Sentry client init
└── sentry.server.config.ts   # Sentry server init
```

## Key entry points
| Path | Role |
|------|------|
| `app/layout.tsx` | Root layout — all providers (Query, User, I18n, Theme) |
| `app/(dashboard)/layout.tsx` | Dashboard shell — Sidebar + real-time alerts + FAB |
| `app/(dashboard)/dashboard/page.tsx` | Main dashboard — hero balance, charts, gamification |
| `app/api/webhook/transaction/route.ts` | External API entry point (PAT auth) |
| `app/api/mcp/route.ts` | MCP server entry point (PAT auth) |
| `lib/supabase/admin.ts` | Server-side DB access (bypasses RLS) |
| `lib/supabase/client.ts` | Client-side DB access (RLS enforced) |
| `lib/user-context.tsx` | Auth state + profile management |
| `hooks/useDashboardData.ts` | Dashboard data aggregation via React Query |
| `types/index.ts` | All shared type definitions |
