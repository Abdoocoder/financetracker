# FinanceTracker (Fajrak) - Project Context

## Overview
A comprehensive personal finance tracking application with:
- **Next.js 14+ App Router** frontend (TypeScript, React, Tailwind CSS)
- **Supabase** backend (PostgreSQL, Auth, Realtime, Edge Functions)
- **Flutter** mobile app (mobile/fajrak_flutter)
- Internationalization (English, Arabic)
- PWA support with service workers

## Key Features
- Transaction management (income/expense, recurring, categories)
- Multi-currency support with exchange rates
- Budget tracking and alerts
- Debt management with auto-deduction
- Investment tracking and wealth simulation
- Zakat calculation and reminders
- Financial health scoring
- AI chat assistant (BYOK - Bring Your Own Key)
- Push notifications (web + mobile)
- Gamification (streaks, challenges, achievements)
- PDF reports and data export
- MCP (Model Context Protocol) integration

## Architecture
```
/app                    # Next.js App Router pages
  /(auth)               # Auth pages (login, register, onboarding, password reset)
  /(dashboard)          # Protected dashboard routes
  /api                  # API routes (Supabase Edge Functions compatible)
/components             # React components
  /dashboard            # Dashboard widgets and cards
  /landing              # Landing page sections
  /settings             # Settings sections
  /transactions         # Transaction components
  /ui                   # Reusable UI components
/hooks                  # Custom React hooks
/lib                    # Shared utilities and business logic
  /byok                 # Bring Your Own Key (AI chat)
  /supabase             # Supabase client/server helpers
  /unified-tools        # MCP tools
/supabase               # Supabase config and migrations
  /migrations           # Database migrations (40+)
  /functions            # Edge Functions
/e2e                    # Playwright E2E tests
/__tests__              # Jest unit/integration tests
/docs                   # Project documentation
/mobile/fajrak_flutter  # Flutter mobile app
/observability          # Grafana dashboards, alerts, runbooks
```

## Tech Stack
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage, Edge Functions)
- **Database**: PostgreSQL with RLS, RPC functions, materialized views
- **Mobile**: Flutter 3.x, Dart
- **Testing**: Jest, React Testing Library, Playwright
- **Observability**: Sentry, OpenTelemetry, Grafana
- **AI**: BYOK pattern for LLM integration, MCP server

## Key Commands
```bash
# Development
npm run dev              # Start Next.js dev server
npm run dev:mobile       # Start Flutter mobile app

# Testing
npm test                 # Run Jest tests
npm run test:e2e         # Run Playwright tests
npm run test:coverage    # Coverage report

# Database
npm run db:push          # Push migrations to Supabase
npm run db:reset         # Reset local database

# Linting/Typechecking
npm run lint             # ESLint
npm run typecheck        # TypeScript check

# Build
npm run build            # Production build
```

## Environment Variables
Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_FIREBASE_*` (for push notifications)
- `OPENAI_API_KEY` (optional, for server-side AI)

## Important Patterns
1. **Server Components by default** - Use `'use client'` only when needed
2. **Supabase RLS** - All data access through RLS policies
3. **RPC Functions** - Complex queries in PostgreSQL functions
4. **BYOK Pattern** - Users bring their own API keys for AI features
5. **Internationalization** - All user-facing text in locale files
6. **Type Safety** - Shared types in `/types/index.ts`