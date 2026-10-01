# FinanceTracker (Fajrak)

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