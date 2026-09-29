<!-- generated-by: gsd-doc-writer -->
# Architecture

## System Overview

FinanceTracker (Fajrak) is a comprehensive personal finance tracking application built as a full-stack TypeScript monorepo. It provides transaction management, budgeting, debt tracking, investment monitoring, zakat calculation, and AI-assisted financial insights. The system follows a **serverless, edge-first architecture** with Next.js 15+ App Router on Vercel, Supabase (PostgreSQL + Auth + Realtime + Edge Functions) as the backend, and a Flutter 3.x mobile app sharing the same Supabase backend. Key architectural principles include **Row Level Security (RLS)** for multi-tenant data isolation, **RPC functions** for complex database operations, **Bring Your Own Key (BYOK)** pattern for AI integration, and **Server Components by default** with selective client-side interactivity.

## Component Diagram

```mermaid
graph TD
    subgraph "Client Layer"
        Web[Next.js Web App]
        Mobile[Flutter Mobile App]
        PWA[Service Worker / PWA]
    end

    subgraph "Edge / Compute Layer"
        NextJS[Next.js Server Components]
        API[API Routes / Route Handlers]
        EdgeFn[Supabase Edge Functions]
        Cron[Vercel Cron Jobs]
    end

    subgraph "Data Layer"
        Postgres[(PostgreSQL + RLS)]
        Realtime[Supabase Realtime]
        Storage[Supabase Storage]
    end

    subgraph "External Services"
        Sentry[Sentry Observability]
        OTel[OpenTelemetry Collector]
        FCM[Firebase Cloud Messaging]
        WebPush[Web Push / VAPID]
        LLM[LLM Providers (BYOK)]
        MCP[MCP Server]
    end

    Web --> NextJS
    Web --> API
    Mobile --> Postgres
    Mobile --> Realtime
    PWA --> Web
    NextJS --> Postgres
    NextJS --> Realtime
    API --> Postgres
    EdgeFn --> Postgres
    EdgeFn --> FCM
    EdgeFn --> WebPush
    Cron --> API
    API --> LLM
    API --> MCP
    NextJS --> Sentry
    API --> Sentry
    EdgeFn --> Sentry
    Postgres --> OTel
    API --> OTel
```

## Data Flow

### 1. **Authentication Flow**
```
User → Next.js (Server Component) → Supabase Auth (PKCE) → JWT in HttpOnly Cookie → RLS Policies Enforced
```
- Supabase Auth handles signup, login, password reset, email confirmation
- PKCE flow for secure OAuth; sessions persisted via `@supabase/ssr` cookie handling
- Server Components read session via `createServerClient()`; client components use `createBrowserClient()`

### 2. **Data Query Flow (Server Components)**
```
Server Component → createServerClient() → Supabase RPC / Query Builder → PostgreSQL (RLS applied) → Typed Response
```
- All user-scoped queries go through RLS policies; no manual `user_id` filtering needed
- Complex aggregations use PostgreSQL RPC functions (e.g., `get_account_balances`, `get_cashflow_summary`)
- Server Components render with data; minimal client-side hydration

### 3. **Mutation Flow (API Routes)**
```
Client Action → API Route Handler → createServerClient() / createAdminClient() → Supabase Mutation → Realtime Broadcast → UI Update
```
- Mutations use API Routes with server-side Supabase client
- Admin client (service role) used only for system operations (crons, webhooks) after auth verification
- Supabase Realtime pushes changes to subscribed clients (web + mobile)

### 4. **Real-time Sync Flow**
```
Database Change (INSERT/UPDATE/DELETE) → Supabase Realtime (PostgreSQL WAL) → WebSocket → Web Client (useRealtime) / Mobile (Realtime client) → Local State Update
```

### 5. **Push Notification Flow**
```
Trigger (Cron, Webhook, User Action) → Supabase Edge Function (push-notification) → 
  ├─ FCM → Android/Flutter App
  └─ Web Push (VAPID) → Service Worker → Browser Notification
```
- Edge Function reads `notification_preferences` (quiet hours, masking) per user
- Invalid tokens cleaned up automatically on 410/404 responses

### 6. **AI Chat Flow (BYOK)**
```
User Message → API Route (/api/byok/chat) → Rate Limit Check (bump_proxy_usage) → 
  Validate User API Key (vault) → Proxy to LLM Provider → Stream Response → Client
```
- Users store encrypted API keys in `user_byok_keys` (AES-GCM via Web Crypto API)
- Per-user rate limiting: 30 req/min via `proxy_usage` table
- Supports OpenAI, Anthropic, Google, OpenRouter, custom endpoints

### 7. **MCP Integration Flow**
```
MCP Client → /api/mcp → Unified Tools Layer → Supabase RPC / Queries → PostgreSQL
```
- Shared `lib/unified-tools` provides: `getAccountBalances`, `getCashflowSummary`, `createTransaction`, idempotency
- Idempotency keys prevent duplicate transactions from retries

## Key Abstractions

| Abstraction | Location | Purpose |
|-------------|----------|---------|
| **Supabase Client Factories** | `lib/supabase/client.ts`, `server.ts`, `admin.ts` | Three client tiers: browser (anon + PKCE), server (anon + cookies), admin (service role, RLS bypass) |
| **RPC Functions** | `supabase/migrations/` (e.g., `get_account_balances`, `bump_proxy_usage`) | Encapsulate complex SQL, enforce RLS, optimize performance |
| **Unified Tools Layer** | `lib/unified-tools/index.ts` | Shared business logic for BYOK proxy and MCP server; single source of truth |
| **BYOK Vault** | `lib/byok/vault.ts`, `chat.ts` | Encrypt/decrypt user API keys; provider-agnostic chat completion streaming |
| **Custom Data Hooks** | `hooks/useTransactions.ts`, `useDashboardData.ts`, `useAccounts.ts` | Encapsulate TanStack Query + Supabase patterns; consistent caching, invalidation |
| **Type Definitions** | `types/index.ts` | Single source of truth for all domain entities (Account, Transaction, Debt, Investment, etc.) |
| **I18n Provider** | `lib/i18n.tsx`, `lib/i18n-server.ts` | Server/client translation with `next-intl` pattern; RTL support for Arabic |
| **Theme Context** | `lib/theme-context.tsx` | SSR-safe theme (light/dark/system) with early inline script to prevent flash |

## Directory Structure Rationale

```
/
├── app/                          # Next.js App Router (file-system routing)
│   ├── (auth)/                   # Auth group: login, register, onboarding, reset-password
│   ├── (dashboard)/              # Protected dashboard routes (layout with sidebar, guards)
│   ├── api/                      # API Route Handlers (REST + streaming)
│   │   ├── byok/                 # BYOK chat proxy, key management
│   │   ├── mcp/                  # MCP server endpoint
│   │   ├── auto-*                # Cron-triggered automation (debt, recurring, salary)
│   │   └── *-alert/              # Notification triggers (budget, zakat, streak, etc.)
│   └── layout.tsx                # Root layout: providers, fonts, SW registration, metadata
├── components/                   # React components (colocated by feature)
│   ├── dashboard/                # Dashboard widgets, charts, cards
│   ├── landing/                  # Marketing landing page sections
│   ├── settings/                 # Settings forms (profile, notifications, security)
│   ├── transactions/             # Transaction list, forms, filters
│   ├── ui/                       # Primitive UI components (Button, Card, Input, etc.)
│   ├── layout/                   # Shell: Header, Sidebar, Footer
│   └── providers/                # Client-side providers (Query, Theme, I18n)
├── hooks/                        # Custom React hooks (data fetching, mutations)
├── lib/                          # Shared business logic & utilities
│   ├── byok/                     # BYOK: vault, chat, providers, key rotation
│   ├── supabase/                 # Supabase client factories (client, server, admin)
│   ├── unified-tools/            # Shared RPC wrappers for BYOK + MCP
│   ├── locales/                  # Translation JSON files (en, ar)
│   ├── errors/                   # Error boundary, toast helpers
│   └── moderation/               # Content moderation utilities
├── supabase/                     # Supabase backend configuration
│   ├── migrations/               # SQL migrations (40+), versioned, run via CLI
│   ├── functions/                # Deno Edge Functions (push-notification)
│   └── config.toml               # Local dev config (ports, auth settings)
├── types/                        # Shared TypeScript types (single source of truth)
├── mobile/fajrak_flutter/        # Flutter 3.x mobile app (separate pubspec, same Supabase)
├── observability/                # Grafana dashboards, alert rules, runbooks, OTel config
├── e2e/                          # Playwright E2E tests (auth, dashboard, transactions)
├── __tests__/                    # Jest unit/integration tests (components, hooks, lib)
├── public/                       # Static assets: SW, manifest, icons, APK
└── docs/                         # Technical docs, PRDs, design specs
```

### Top-Level Directory Purposes

| Directory | Purpose |
|-----------|---------|
| `app/` | Next.js App Router: pages, layouts, API routes, route groups |
| `components/` | Reusable React components organized by feature/domain |
| `hooks/` | Custom hooks encapsulating data fetching, mutations, UI state |
| `lib/` | Framework-agnostic business logic, utilities, client factories |
| `supabase/` | Backend schema, migrations, Edge Functions, local dev config |
| `types/` | Domain types shared across web, mobile, API, MCP |
| `mobile/` | Flutter app with own build system, shares Supabase backend |
| `observability/` | Production monitoring: dashboards, alerts, tracing, runbooks |
| `e2e/` / `__tests__/` | Test suites: E2E (Playwright), Unit/Integration (Jest + RTL) |

## Security Architecture

- **RLS Everywhere**: All user tables have `user_id` + policies; no `WHERE user_id = ?` in application code
- **Service Role Isolation**: `createAdminClient()` only in API routes after `getUser()` verification; throws if imported client-side
- **BYOK Encryption**: User API keys encrypted with AES-GCM (Web Crypto API); keys never logged
- **Rate Limiting**: Per-user proxy limits via `proxy_usage` table + `bump_proxy_usage` RPC
- **CSP & Security Headers**: Configured in `next.config.mjs` (frame denial, HSTS, permissions policy)
- **Idempotency**: `check_and_reserve_idempotency_key` RPC prevents duplicate mutations

## Deployment & Operations

- **Platform**: Vercel (Next.js) + Supabase (managed PostgreSQL)
- **Cron Jobs**: Defined in `vercel.json` (auto-debt, auto-recurring, budget-alerts)
- **Edge Functions**: Supabase Deno functions for push notifications
- **Observability**: Sentry (errors, traces, session replay) + OpenTelemetry (metrics, traces) → Grafana
- **Environment Variables**: `.env.local` for local; Vercel/Supabase dashboard for production
- **Database Migrations**: `supabase db push` (local) / Supabase Dashboard (production)

<!-- VERIFY: Production URLs (fajrak.com, Supabase project ref, Sentry org/project) -->
<!-- VERIFY: Vercel team/project IDs for deployment -->
<!-- VERIFY: Supabase project region and connection pooling settings -->