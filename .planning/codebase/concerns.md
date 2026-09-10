# Known Concerns & Technical Debt — Fajrak

## Security Concerns

### 1. Rate Limiter is In-Memory Only
**File**: `lib/rate-limit.ts`
**Risk**: Medium
**Detail**: Rate limiting uses `Map` in memory. On Vercel's multi-region deployments, each instance has its own store. A user can bypass limits by hitting different instances.
**Recommendation**: Migrate to `@upstash/ratelimit` backed by Redis for distributed rate limiting.

### 2. Service Worker Registration Noise
**File**: `sentry.client.config.ts`
**Risk**: Low
**Detail**: Sentry filters out service worker registration errors, indicating these are a known issue. The `beforeSend` hook drops events from `serviceWorker.register` failures.
**Impact**: Silent failures on strict browsers.

### 3. Cron Secret in Environment
**File**: `lib/cron-auth.ts`
**Risk**: Low
**Detail**: `CRON_SECRET` must be set in Vercel environment. If unset, cron endpoints throw (fail-loud pattern). This is correctly implemented but requires manual setup.

## Performance Concerns

### 4. Dashboard Page Fetches Data Multiple Ways
**File**: `app/(dashboard)/dashboard/page.tsx`
**Risk**: Medium
**Detail**: The dashboard page uses both `useDashboardData()` (React Query) AND direct `useAccounts()` AND manual `fetch('/api/gamification')`. This creates parallel data fetching with different caching strategies.
**Impact**: Potential over-fetching and inconsistent cache invalidation.

### 5. Dynamic Imports Without Error Boundaries
**File**: `app/(dashboard)/layout.tsx`, `app/(dashboard)/dashboard/page.tsx`
**Risk**: Low
**Detail**: Dynamic imports use `loading: () => null` or skeleton fallbacks but don't wrap in error boundaries. If a dynamic component fails to load, the error propagates to the parent `ErrorBoundary`.
**Impact**: Graceful degradation exists but could be more granular.

### 6. Large Bundle from Recharts
**File**: `components/dashboard/Charts.tsx`
**Risk**: Low
**Detail**: Recharts 3.8 is dynamically imported (`ssr: false`) which helps, but the library itself is large. Only `MiniBarChart` and `CategoryBars` are used.
**Impact**: Mitigated by dynamic import, but chart bundle is still significant.

## Code Quality Concerns

### 7. Test Coverage Well Below Target
**Risk**: High
**Detail**: 31.91% statement coverage vs 80% target. All 15 dashboard pages have 0% coverage. 14 of 28 API routes have 0% coverage.
**Impact**: High regression risk for untested features.

### 8. No Component-Level Tests
**Risk**: Medium
**Detail**: Testing exists at page level (integration) and API route level, but no isolated component tests. Components like `HeroBalanceCard`, `NetWorthCard`, `QuickAdd` are untested.
**Impact**: UI regressions may not be caught.

### 9. Inline Comments in Arabic
**Risk**: Low
**Detail**: Code comments are in Arabic (e.g., `// ── تعريف الشارات`). While fine for the team, this may create barriers for non-Arabic-speaking contributors.
**Impact**: Accessibility for international contributors.

### 10. `any` Types in Gamification Logic
**File**: `app/api/gamification/route.ts`
**Risk**: Low
**Detail**: Badge check functions use `(s: any)` parameter type, bypassing TypeScript strict mode.
```typescript
{ id: 'first_tx', check: (s: any) => s.total_transactions >= 1 }
```
**Impact**: No type safety on stats object for badge calculations.

## Infrastructure Concerns

### 11. Sentry Sampling Configuration
**File**: `sentry.client.config.ts`
**Risk**: Low
**Detail**: `tracesSampleRate: 0.1` (10% of traces), `replaysSessionSampleRate: 0.05` (5% of sessions). These are reasonable production values but may miss edge cases.
**Impact**: Low visibility into performance issues.

### 12. E2E Test Environment Dependencies
**File**: `e2e/setup/global-setup.ts`
**Risk**: Medium
**Detail**: E2E tests require `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD` env vars pointing to a real Supabase account. Tests skip gracefully if unset but authenticated tests won't run.
**Impact**: CI/CD may not run full E2E suite without secrets configured.

### 13. No Database Migration Tests
**Risk**: Medium
**Detail**: `supabase/migrations/` contains SQL migrations but no tests verify they apply cleanly or produce expected schema.
**Impact**: Migration failures may only be caught in production.

### 14. Firebase Messaging SW Registration
**File**: `app/layout.tsx`
**Risk**: Low
**Detail**: Android-only Firebase messaging service worker registration happens in root layout via inline script. iOS doesn't get Firebase SW.
**Impact**: Correct platform-specific behavior but inline script is a minor CSP concern.

## Missing Features / Gaps

### 15. No Offline Support
**Risk**: Low
**Detail**: Service worker (`/sw.js`) is registered but no offline caching strategy is evident. PWA manifest exists but offline-first behavior is not implemented.
**Impact**: App requires network connection for all operations.

### 16. No i18n for E2E Tests
**Risk**: Low
**Detail**: E2E tests hardcode Arabic locators (e.g., `getByText('فجرك')`). If the app's default language changes, all E2E tests break.
**Impact**: Maintenance burden for language changes.

### 17. No API Documentation
**Risk**: Medium
**Detail**: The webhook API and MCP server have no formal API documentation (OpenAPI/Swagger). The MCP route describes itself but there's no external docs.
**Impact**: External developers cannot easily integrate with the API.
