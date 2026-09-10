# Code Quality — Fajrak

## Current Metrics

### Test Coverage (Jest)
| Metric | Coverage | Threshold |
|--------|----------|-----------|
| Statements | 31.91% | 80% |
| Branches | 22.42% | 80% |
| Functions | 23.68% | 80% |
| Lines | 33.36% | 80% |

**All four metrics are below the 80% target.**

### Test Suites
- **37 test suites** passing (37 passed, 1 failed initially, then fixed)
- **443 tests** passing
- **0 skipped tests**

### E2E Tests
- **7 Playwright tests** across 3 spec files
- Smoke test: landing page + login navigation
- Auth flow: login → dashboard → transactions → logout
- Transaction management: add/edit/delete transactions

### Static Analysis
- **ESLint**: Clean (no warnings or errors)
- **TypeScript strict**: Clean (no type errors)
- **Build**: Successful (54 routes, standalone output)

## Coverage Gaps

### Untested Dashboard Pages (0% coverage)
All 15 dashboard page components have 0% test coverage:
- `app/(dashboard)/dashboard/page.tsx`
- `app/(dashboard)/dashboard/accounts/page.tsx`
- `app/(dashboard)/dashboard/transactions/page.tsx`
- `app/(dashboard)/dashboard/budgets/page.tsx`
- `app/(dashboard)/dashboard/debts/page.tsx`
- `app/(dashboard)/dashboard/investments/page.tsx`
- `app/(dashboard)/dashboard/goals/page.tsx`
- `app/(dashboard)/dashboard/alerts/page.tsx`
- `app/(dashboard)/dashboard/settings/page.tsx`
- `app/(dashboard)/dashboard/chat/page.tsx`
- `app/(dashboard)/dashboard/zakat/page.tsx`
- `app/(dashboard)/dashboard/fire/page.tsx`
- `app/(dashboard)/dashboard/pdf-report/page.tsx`
- `app/(dashboard)/dashboard/learn/page.tsx`
- `app/(dashboard)/dashboard/help/page.tsx`

### Untested API Routes (0% coverage)
14 of 28 API route groups have 0% coverage:
- `auto-recurring`, `auto-salary`, `daily-reminder`, `evening-reminder`
- `exchange-rate`, `gamification`, `health`, `new-user-nudge`
- `push-send`, `push-subscribe`, `push-test`
- `smart-notifications`, `stock-price`, `streak-alert`
- `testimonials`, `weekly-report`, `zakat-reminder`, `zakat/prices`
- `confirm`, `auth/callback`

### Tested Libraries (partial coverage)
- `lib/rate-limit.ts` — has dedicated tests
- `lib/cache.ts` — has dedicated tests
- `lib/currencies.ts` — has dedicated tests
- `lib/currency.ts` — has dedicated tests
- `lib/api-keys.ts` — has dedicated tests
- `lib/firebase.ts` — has dedicated tests
- `lib/push-send.ts` — has dedicated tests
- `lib/cron-auth.ts` — has dedicated tests
- `lib/byok/*` — has dedicated tests (envelope, vault, chat, providers)

### Tested Hooks (partial coverage)
- `useAccounts` — has tests
- `useTransactions` — has tests
- `useFinancialSummary` — has tests
- `useDashboardData` — NO tests
- `useDashboardLayout` — NO tests

## Code Quality Indicators

### Positive Patterns
1. **Consistent error handling**: API routes use try/catch with structured error responses
2. **Input validation**: Zod schemas for external API inputs
3. **Security-first**: Timing-safe comparisons, input sanitization, RLS on all tables
4. **Type safety**: TypeScript strict mode, shared type definitions
5. **Separation of concerns**: Clear boundaries between auth, data, UI layers
6. **Dynamic imports**: Heavy components loaded on demand
7. **Cleanup patterns**: useEffect cleanup for subscriptions and timers
8. **Skeleton loading**: CSS class-based skeletons for loading states

### Areas for Improvement
1. **Test coverage**: 31.91% statements is well below 80% target
2. **Dashboard page tests**: All 15 pages untested
3. **API route tests**: 14 of 28 routes untested
4. **Hook tests**: 2 of 5 hooks untested
5. **Component tests**: No component-level tests (only page/API/hook tests)
6. **No integration tests**: Tests are unit-focused with mocked Supabase
7. **Rate limiter**: In-memory only — needs Redis for production multi-region

## Testing Infrastructure

### Jest Configuration
- Environment: `jsdom` (simulates browser)
- Path alias: `@/` → project root
- Coverage collection: `app/`, `lib/`, `hooks/`, `types/`
- Excludes: `node_modules/`, `.next/`, `mobile/`, `__tests__/helpers/`, `e2e/`

### Mock Patterns
- `__tests__/helpers/supabase-mock.ts` provides:
  - `createFluentQuery()` — chainable query mock (thenable)
  - `createMockSupabase()` — table-result mapping
  - `makeRequest()` — NextRequest builder with auth headers
- Each test file mocks `@/lib/supabase/admin` and `@/lib/supabase/client`
- Chain proxy pattern for Supabase method chaining

### E2E Infrastructure
- Global setup: Supabase PKCE login → `storageState` persistence
- Auth credentials: `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` env vars
- Arabic language: Default for all E2E locators
- Chromium-only: Single browser project
- Base URL: `http://localhost:3000`
- Web server: Auto-starts `npm run dev` before tests
