# Architecture — Fajrak

## High-Level Pattern
**Next.js App Router + Supabase BaaS + Client-Side Data Fetching**

The app follows a "thin server" architecture:
- **Server side**: Next.js Server Components handle layout, metadata, and initial auth
- **Client side**: `'use client'` components fetch data via Supabase client or React Query hooks
- **API routes**: Used for cron jobs, external webhooks, BYOK proxy, and operations requiring admin privileges
- **Database**: Supabase provides PostgreSQL + Auth + Realtime + RLS as a managed backend

## Request Lifecycle

### Authenticated Page Load
1. `app/layout.tsx` (Server) — renders providers (Query, User, I18n, Theme), font, SW registration
2. `app/(dashboard)/layout.tsx` (Client) — UserProvider resolves auth state via `onAuthStateChange`
3. If unauthenticated → redirect to `/login`
4. Page component renders → hooks fire Supabase queries via React Query
5. Real-time subscription on `alerts` table updates badge count live

### API Route (Cron Job)
1. Request hits `/api/daily-reminder` (or similar)
2. `verifyCronAuth(request)` checks Bearer token against `CRON_SECRET` (timing-safe)
3. `createAdminClient()` gets service-role Supabase client (bypasses RLS)
4. Queries DB, computes logic, sends push notifications
5. Returns JSON response

### External API (Webhook/MCP)
1. Request hits `/api/webhook/transaction` or `/api/mcp`
2. `verifyApiKey(token)` validates PAT (`fjk_live_...`)
3. `rateLimit(request)` enforces per-key rate limit
4. Zod schema validates request body
5. `writeAuditLog()` records the access
6. `createAdminClient()` performs DB operations
7. Returns JSON response

## Provider Hierarchy
```
<html>
  <body>
    <QueryProvider>          # TanStack React Query
      <UserProvider>         # Supabase auth + profile
        <I18nProvider>       # Arabic/English i18n
          <ThemeProvider>    # Dark/light mode
            {children}
          </ThemeProvider>
        </I18nProvider>
      </UserProvider>
    </QueryProvider>
  </body>
</html>
```

Dashboard layout adds:
```
<ToastProvider>
  <ErrorBoundary>
    <DashboardContent>
      <Sidebar />
      <main>{children}</main>
      <GlobalFAB />
      # Dynamic: PushPrompt, InstallPrompt, WelcomeModal, OnboardingTour
    </DashboardContent>
  </ErrorBoundary>
</ToastProvider>
```

## Data Flow Patterns

### Pattern 1: Direct Supabase Client Query
Used in: `useAccounts`, `useTransactions`
```
Component → createClient() → supabase.from('table').select().eq() → setState()
```
- Runs client-side, RLS enforced
- Manual loading/error state via useState

### Pattern 2: React Query Hook
Used in: `useDashboardData`, `useFinancialSummary`
```
Component → useQuery({ queryKey, queryFn }) → { data, isLoading, error }
```
- Automatic caching, deduplication, refetching
- `queryKey` includes user ID for cache invalidation

### Pattern 3: Server-Side Admin Query
Used in: API routes (cron, webhooks)
```
Route → createAdminClient() → supabase.from('table').select() → NextResponse.json()
```
- Bypasses RLS (admin privileges)
- Used for cross-user operations (cron jobs)

### Pattern 4: Real-Time Subscription
Used in: Dashboard layout (alerts count)
```
supabase.channel('alerts-count')
  .on('postgres_changes', { table: 'alerts', filter: `user_id=eq.${id}` })
  .subscribe()
```

## Module Boundaries

### Strict Boundaries
- `lib/supabase/admin.ts` — NEVER import in client components (contains service role key)
- `lib/supabase/client.ts` — NEVER import in API routes for user operations (use admin)
- `lib/supabase/server.ts` — For server components/actions that need user-context queries
- `lib/cron-auth.ts` — Only used in cron-triggered API routes
- `lib/api-keys.ts` — Only used in PAT-authenticated routes (webhook, mcp, api-keys)

### Shared Modules (used everywhere)
- `types/index.ts` — All type definitions
- `lib/i18n.tsx` — Client i18n
- `lib/user-context.tsx` — Auth state
- `lib/currencies.ts` — Currency definitions
- `lib/rate-limit.ts` — Rate limiting (API routes only)

## Build & Deployment
- **Platform**: Vercel (standalone output)
- **Build**: `next build` → standalone output in `.next/standalone/`
- **Dev**: `next dev --turbopack` (fast refresh)
- **Static assets**: Served from `public/` (manifest.json, icons, SW files)
- **Mobile**: Flutter APK distributed via Google Play Store
- **Cron jobs**: External service (cron-job.org) hits API routes with `CRON_SECRET` Bearer token
