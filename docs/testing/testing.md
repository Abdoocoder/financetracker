<!-- generated-by: gsd-doc-writer -->
---
title: Testing
description: Testing guide for Fajrak web and mobile apps
---

# Testing Guide

This document covers the testing setup, commands, and conventions for both the Next.js web app and the Flutter mobile app.

## Test Framework and Setup

### Web (Next.js)

| Framework | Version | Purpose |
|-----------|---------|---------|
| **Jest** | 30.3.0 | Unit and integration testing |
| **React Testing Library** | 16.3.2 | Component testing |
| **Playwright** | 1.63.0 | End-to-end testing |
| **ts-jest** | 29.4.6 | TypeScript support |
| **jest-environment-jsdom** | 30.3.0 | DOM environment for tests |

**Configuration Files:**
- `jest.config.js` — Main Jest configuration (extends `next/jest`)
- `jest.setup.js` — Global test setup (mocks for Supabase, Firebase, Next.js router, sessionStorage, matchMedia)
- `playwright.config.ts` — Playwright E2E configuration

**Test Environment:** Jest uses `jest-environment-jsdom` with Next.js integration via `next/jest`. The config maps `@/` aliases to the project root and handles BYOK crypto utilities.

**Global Mocks (jest.setup.js):**
- `window.matchMedia` — mocked for responsive component tests
- `sessionStorage` — in-memory mock
- `next/navigation` — `useRouter`, `usePathname`, `useSearchParams` mocked
- `@supabase/supabase-js` — full client mock with chainable query builders
- `firebase-admin` — `initializeApp`, `getApps`, `cert`, `getMessaging` mocked
- `web-push` — `setVapidDetails`, `sendNotification` mocked

### Mobile (Flutter)

| Framework | Version | Purpose |
|-----------|---------|---------|
| **flutter_test** | SDK built-in | Unit, widget, and integration testing |
| **flutter_lints** | 6.0.0 | Static analysis rules |

**Configuration:**
- Tests live in `mobile/fajrak_flutter/test/`
- No external mocking framework — uses inline constants/maps and helpers declared inside `group()`
- `flutter_lints` enforced via `flutter analyze`

**Test Structure (mirrors `lib/`):**
```
test/
├── i18n_keys_test.dart                    # Validates ar.json/en.json parity
├── repositories/                          # Repository layer tests
├── screens/                               # Screen/widget tests
├── services/                              # Service layer tests (BYOK, currency, sync, etc.)
├── utils/                                 # Utility function tests
└── widgets/                               # Widget component tests
```

## Running Tests

### Web (Next.js)

| Command | Description |
|---------|-------------|
| `npm test` | Run all unit and integration tests (798 tests across 85 suites) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:e2e` | Run Playwright E2E tests (requires dev server on port 3000) |

**Playwright E2E Details:**
- Config: `playwright.config.ts`
- Test directory: `e2e/`
- Global setup: `e2e/setup/global-setup.ts` (builds authenticated storageState)
- Base URL: `http://localhost:3000`
- Browser: Chromium (system channel)
- Parallel: Yes (2 workers locally, 1 on CI)
- Retries: 1 locally, 2 on CI
- Web server: `node scripts/e2e-dev-server.js` (health check at `/api/health`)

### Mobile (Flutter)

| Command | Description |
|---------|-------------|
| `cd mobile/fajrak_flutter && make test` | Run all tests (260 tests) |
| `cd mobile/fajrak_flutter && make test-coverage` | Run tests with coverage (generates `coverage/html/index.html`) |
| `cd mobile/fajrak_flutter && flutter test` | Run tests directly (same as `make test`) |

## Writing New Tests

### Web (Next.js)

**File Naming Convention:**
- Unit/integration: `__tests__/**/*.test.ts` or `__tests__/**/*.test.tsx`
- E2E: `e2e/**/*.test.ts`

**Test Patterns:**

1. **Component Tests** — Use React Testing Library:
```tsx
import { render, screen } from '@testing-library/react'
import { MyComponent } from '@/components/MyComponent'

test('renders correctly', () => {
  render(<MyComponent />)
  expect(screen.getByText('Expected Text')).toBeInTheDocument()
})
```

2. **Hook Tests** — Use `@testing-library/react` renderHook:
```tsx
import { renderHook, act } from '@testing-library/react'
import { useMyHook } from '@/hooks/useMyHook'

test('updates state', () => {
  const { result } = renderHook(() => useMyHook())
  act(() => { result.current.doSomething() })
  expect(result.current.value).toBe(expected)
})
```

3. **API Route Tests** — Mock Supabase and test handler:
```ts
import { POST } from '@/app/api/route/route'
import { createClient } from '@supabase/supabase-js'

jest.mock('@supabase/supabase-js')

test('returns 200 on success', async () => {
  const req = new Request('http://localhost', { method: 'POST', body: JSON.stringify({}) })
  const res = await POST(req)
  expect(res.status).toBe(200)
})
```

4. **External API Mocks — CRITICAL RULE:** Always verify mocks against the real endpoint. Before writing a test that mocks an external API (Yahoo Finance, FreeGoldAPI, Supabase Auth, etc.):
   - `curl` the real URL
   - Paste the actual response shape into a comment next to the fixture
   - Include the verification date
   - *Example:* `// Verified 2026-10-19 against https://api.example.com/endpoint`

**Conventions:**
- English descriptions for service/i18n tests
- Use `jest.mock()` at top of file for module mocks
- Leverage global mocks from `jest.setup.js` where possible

### Mobile (Flutter)

**File Naming Convention:**
- `test/**/*_test.dart`

**Test Patterns:**

1. **Service Tests** — Use inline constants/maps, no mocking framework:
```dart
group('CurrencyService', () {
  const Map<String, double> mockRates = {'USD': 1.0, 'EUR': 0.85};
  
  test('formatAmount returns formatted string', () {
    final result = CurrencyService.formatAmount(100, 'USD', rates: mockRates);
    expect(result, '\$100.00');
  });
});
```

2. **Widget Tests** — Use `WidgetTester`:
```dart
testWidgets('renders AlertCard correctly', (WidgetTester tester) async {
  await tester.pumpWidget(MaterialApp(home: AlertCard(alert: mockAlert)));
  expect(find.text('Alert Title'), findsOneWidget);
});
```

3. **Repository Tests** — Arabic descriptions accepted:
```dart
group('TransactionRepository', () {
  test('10 تحديثات على نفس المعاملة ينتج payload مدمج', () async {
    // test implementation
  });
});
```

4. **i18n Tests** — Validate key parity between `ar.json` and `en.json`:
```dart
test('ar.json and en.json have identical keys', () {
  expect(arKeys, equals(enKeys));
});
```

**Conventions:**
- `TestWidgetsFlutterBinding.ensureInitialized()` in `setUpAll` for widget tests
- Raw timeouts accepted in service tests (no `fake_async`)
- Helper functions declared inside `group()`
- Mirror `lib/` structure under `test/`

## Coverage Requirements

### Web (Next.js)

**Current Configuration:** No explicit coverage thresholds configured in `jest.config.js`.

**Coverage Collection (from jest.config.js):**
- `app/**/*.{js,ts,tsx}`
- `lib/**/*.{js,ts,tsx}`
- `hooks/**/*.{js,ts,tsx}`
- `types/**/*.{js,ts,tsx}`
- Excludes: `**/*.d.ts`, `**/node_modules/**`

**Current Status:** No coverage threshold enforced. Run `npm run test:coverage` to generate report.

### Mobile (Flutter)

**Current Configuration:** No explicit coverage thresholds configured.

**Coverage Command:** `make test-coverage` generates LCOV report at `coverage/lcov.info` and HTML at `coverage/html/index.html`.

**Current Status:** No coverage threshold enforced.

## CI Integration

### Current State

**CI/CD pipelines detected in `.github/workflows/`:**

| Workflow File | Trigger | Description |
|---------------|---------|-------------|
| `lint-test-build.yml` | Push/PR to `main` | Main CI: web (lint, typecheck, test, build) + mobile (flutter analyze, test) |
| `smart-notifications.yml` | Scheduled (cron, 7× daily) + manual | Triggers smart notifications API endpoint |
| `supabase-backup.yml` | Daily at 02:00 UTC + manual | PostgreSQL 17 backup (schema + data) → Cloudflare R2 |
| `supabase-validate.yml` | Push to `main` + manual | Migration structure guard + isolated schema validation (local DB) |

#### `lint-test-build.yml` — Main CI Pipeline

**Trigger:** Push/PR to `main` branch  
**Jobs:**
1. **`lint-typecheck-test`** (web) — `ubuntu-latest`, Node 22:
   - Validate prompts (`scripts/validate_prompts.py`, `scripts/render_check_prompts.py`)
   - Validate test counts (web) — `scripts/validate_test_counts.py --web`
   - `npm ci` → `npm run lint` → `npm run typecheck` → `npm run test` → `npm run build`
2. **`mobile`** (Flutter) — `ubuntu-latest`, Flutter 3.47.6 stable:
   - `flutter pub get` → `dart run build_runner build --delete-conflicting-outputs`
   - `flutter analyze` → `flutter test`
   - Validate test counts (mobile) — `scripts/validate_test_counts.py --flutter`

**Concurrency:** Cancels superseded runs on same ref.

#### `smart-notifications.yml` — Scheduled Notifications

**Trigger:** 7 cron schedules daily (UTC times mapping to UTC+3 local) + `workflow_dispatch`  
**Job:** Calls `https://fajrak.com/api/smart-notifications` with `CRON_SECRET` bearer token.

#### `supabase-backup.yml` — Daily Database Backup

**Trigger:** Daily 02:00 UTC + `workflow_dispatch`  
**Job:** Installs PostgreSQL 17 client, runs `pg_dump` (schema-only, data-only with inserts, custom format), verifies non-empty, uploads `full_backup.dump` to GitHub Artifacts (30-day retention) and Cloudflare R2.

#### `supabase-validate.yml` — Migration Validation

**Trigger:** Push to `main` + `workflow_dispatch`  
**Jobs:**
1. **`guard`** — Blocks real `supabase db push` (without `--dry-run`) in any workflow; validates migration naming (`NNN_snake_case.sql` or `YYYYMMDDHHMMSS_snake_case.sql`); checks legacy archive count (expects 42).
2. **`validate-sql`** (needs: `guard`) — Boots empty local Supabase DB, best-effort replays legacy migrations (001–041), strictly applies top-level migrations, runs advisory `supabase db lint`.

### Local Quality Gates

The `npm run doctor` command serves as a comprehensive local health check:

```bash
npm run doctor
```

This runs:
1. `npx next info` — Next.js environment info
2. `npm audit --omit=dev --audit-level=high` — Security audit
3. `npm run lint` — ESLint
4. `npm run typecheck` — TypeScript type checking
5. `npm run test:coverage` — Tests with coverage
6. `npm run build` — Production build

### CI Test Stages Summary

The existing CI covers:
1. **Web Unit/Integration** — `npm test` (Jest) ✅
2. **Web Lint/Typecheck/Build** — `npm run lint`, `npm run typecheck`, `npm run build` ✅
3. **Mobile Analyze/Test** — `flutter analyze`, `flutter test` ✅
4. **Test Count Validation** — `scripts/validate_test_counts.py` (web + mobile) ✅
5. **Prompt Validation** — `scripts/validate_prompts.py` ✅
6. **Migration Validation** — Isolated schema check ✅
7. **Scheduled Operations** — Notifications cron, DB backup ✅

### Test Counts (as of 2026-10-29)

| Platform | Test Type | Count |
|----------|-----------|-------|
| Web | Unit + Integration | 798 tests across 85 suites |
| Web | E2E | 7 Playwright specs in `e2e/` |
| Mobile | Unit + Widget | 347 tests |

> Re-measure with `npx jest --ci` and `flutter test` as counts may change.

## Quick Reference

### Web
```bash
# All tests
npm test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch

# E2E (start dev server first: npm run dev)
npm run test:e2e
```

### Mobile
```bash
cd mobile/fajrak_flutter

# All tests
make test
# or
flutter test

# With coverage
make test-coverage
# opens coverage/html/index.html
```

### Full Health Check
```bash
npm run doctor
```