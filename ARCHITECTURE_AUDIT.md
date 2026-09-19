# Architecture Audit — Fajrak Financial Journey 2.0
**Date:** 2026-09-19  
**Phase:** Pre-Phase 0 Audit (before any implementation)

---

## 1. Existing Financial Intelligence

### 1.1 Core Financial RPCs (Supabase)

| RPC | Purpose | Location | Consumers |
|-----|---------|----------|-----------|
| `get_financial_dashboard(uuid, double precision)` | Aggregated financial state (net worth, accounts, investments, goals, debts, alerts, health_score) | `legacy/035_dashboard_rpc_consolidate.sql` | Web: `useDashboardData.ts`, Zakat page; Flutter: `FinanceService.fetchFinancialDashboard`, `DashboardScreen`, `ZakatCalculatorScreen` |
| `calculate_health_score(uuid, double precision)` | Single integer health score (0-100) | `legacy/026_centralized_health_score.sql` | Web: `FinancialHealthCombined.tsx` (fallback), `health-score-snapshot` cron; Flutter: `DashboardHealthScore` (via RPC) |
| `get_monthly_financial_summary(uuid, int, int)` | Monthly income/expenses/debt_payments/net | `legacy/033_unified_monthly_financial_summary.sql` | Web: `useFinancialSummary.ts`; Flutter: `FinanceService.fetchMonthlyFinancialSummary` |
| `get_account_balances(uuid)` | Per-account balances from transactions | `20260907083248_verify_owner_in_user_rpcs.sql` | Flutter: `AccountsService.fetchAccounts` |
| `get_zakat_summary(uuid, ...)` | Zakat calculation | `20260907083248_verify_owner_in_user_rpcs.sql` | Flutter: `FinanceService.fetchZakatSummary`, `ZakatCalculatorScreen` |
| `delete_user_account(uuid)` | Account deletion | `20260907083248_verify_owner_in_user_rpcs.sql` | — |
| `upsert_investment_cash(uuid, text, numeric)` | Investment cash management | `20260907083248_verify_owner_in_user_rpcs.sql` | — |

### 1.2 Health Score System

**Current Implementation (`legacy/026_centralized_health_score.sql`):**
- Single PL/pgSQL function returning `integer` (0-100)
- Components (hardcoded thresholds):
  - Savings Rate: ≥20% = 30pts, ≥10% = 20pts, >0 = 10pts
  - Debt Ratio: 0 = 25pts, <30% = 20pts, <60% = 10pts
  - Emergency Fund: ≥1.0 = 20pts, ≥0.5 = 12pts, >0 = 6pts
  - Investments: >0 = 15pts
  - Transaction Count (30d): ≥10 = 10pts, ≥5 = 6pts, >0 = 3pts
- **Problems:**
  - No component breakdown returned
  - No reason codes/drivers
  - Thresholds hardcoded in SQL
  - No versioning of calculation policy
  - Web `FinancialHealthCombined.tsx` duplicates calculation logic for roadmap UI

**History Table:** `health_score_history` (daily snapshots with score + raw metrics)

### 1.3 Gamification System

**Location:** `/app/api/gamification/route.ts` + `user_stats` table
- Badges, streaks, levels, points
- Computed in API route (not RPC) using admin client
- **Duplicates financial metrics** (savings rate, debt ratio, emergency fund, net worth) independently
- Badges trigger alerts on achievement

### 1.4 Journey/Stage Concept (Flutter Only)

**Location:** `DashboardScreen._loadPhase2()` (inline logic)
```dart
String stage = 'awareness';
if (totalDebt > 0 && income > 0 && totalMonthly / income > 0.3) {
  stage = 'debt';
} else if (totalDebt == 0 && goalsSaved < income * 3) {
  stage = 'emergency';
} else if (invValue > 0) {
  stage = 'investing';
}
```
- No Web equivalent
- No persistence, no versioning, no gates/milestones

### 1.5 NBA (Next Best Action) — **Does Not Exist**

No recommendation engine, no `financial_recommendations` table.

---

## 2. Existing Web Consumers

### 2.1 Hooks

| Hook | RPC Used | Returns | Issues |
|------|----------|---------|--------|
| `useDashboardData` | `get_financial_dashboard` + direct transaction queries | `DashboardData` (income, expenses, net, categories, months6, healthScore, netWorth, etc.) | Duplicates monthly aggregation in TypeScript; calls RPC twice for currency |
| `useFinancialSummary` | `get_monthly_financial_summary` | Monthly income/expenses/debt/net | Thin wrapper |
| `useAccounts` | Direct `accounts` table + `get_account_balances` | Accounts with balances | — |
| `useTransactions` | Direct `transactions` table | Full transaction list | — |
| `useDashboardLayout` | LocalStorage (SharedPreferences on Flutter) | Card visibility | Parity with Flutter `DashboardLayoutProvider` |

### 2.2 Components

| Component | Data Source | Issues |
|-----------|-------------|--------|
| `FinancialHealthCombined` | Props from `useDashboardData` + **own Supabase queries** for roadmap | **Direct Supabase access in component**; recalculates stage, strengths, improvements, nextStep in TypeScript; duplicates health metrics |
| `HeroBalanceCard` | Props from `useDashboardData` + `useAccounts` | — |
| `DashboardStats` | Props from `useDashboardData` | — |
| `MonthSummaryBanner` | Props | — |
| `QuickAdd` | Direct Supabase inserts | UI + data access + currency logic all in one component |
| `Charts` | Props from `useDashboardData` | — |

### 2.3 API Routes (Background Jobs)

| Route | Purpose | Financial Logic |
|-------|---------|-----------------|
| `/api/health-score-snapshot` | Daily health score snapshot | **Duplicates `calculate_health_score` inputs**; calls RPC per user |
| `/api/gamification` | Badge/streak/points calculation | **Full financial recalculation** (income, expenses, debts, investments, goals, net worth) |
| `/api/daily-reminder` | Daily push | Uses transaction data |
| `/api/weekly-report` | Weekly email/report | — |
| `/api/zakat-reminder` | Zakat reminder | — |

---

## 3. Existing Flutter Consumers

### 3.1 Services

| Service | RPC/Direct Access | Returns |
|---------|-------------------|---------|
| `FinanceService` | `get_financial_dashboard`, `get_monthly_financial_summary`, `get_zakat_summary` | Maps RPC responses to `Map<String, dynamic>` |
| `AccountsService` | `get_account_balances` + direct `accounts` table | Accounts with computed balances |
| `CurrencyService` | HTTP (external API) | Exchange rates, formatting |

### 3.2 Screens/Widgets

| Component | Data Source | Issues |
|-----------|-------------|--------|
| `DashboardScreen` (500+ lines) | `FinanceService`, `AccountsService`, direct table queries | **Massive orchestrator**; computes income, expenses, net, debt, stage, health score inline; phase 1/2 loading pattern |
| `DashboardHealthScore` | `calculate_health_score` RPC + direct `health_score_history` | Separate RPC call for history |
| `DashboardStageCard` | Stage string from `DashboardScreen` | No persistence, no gates |
| `QuickAdd` (widget) | Direct Supabase insert | — |

---

## 4. Existing Background Consumers

| Consumer | Financial Logic Location | Duplicates |
|----------|-------------------------|------------|
| `health-score-snapshot` cron | TypeScript (inline) + `calculate_health_score` RPC | Recalculates income/expenses/debts/investments/goals |
| `gamification` API | TypeScript (inline) | Full financial recalculation |
| `daily-reminder` cron | TypeScript (inline) | Transaction queries |
| `weekly-report` cron | — | — |
| `zakat-reminder` cron | — | — |

---

## 5. Existing Feature Flags

**NONE.** No feature flag infrastructure exists in the codebase (database or application).

---

## 6. Existing Tests

| Layer | Coverage | Financial Logic Tests |
|-------|----------|----------------------|
| Jest (Web) | 58 suites, 540 tests | `__tests__/hooks/useFinancialSummary.test.ts`, `__tests__/lib/currency.test.ts` |
| Playwright (E2E) | 3 specs | Smoke, auth, transaction management |
| Flutter | `flutter test` | `i18n_keys_test.dart`, service/screen/widget tests |
| **Financial Calculation Unit Tests** | **MISSING** | No tests for `calculate_health_score`, `get_financial_dashboard`, journey logic |

---

## 7. Duplicated Calculations (Critical Friction)

| Calculation | Locations |
|-------------|-----------|
| **Net Worth** | `get_financial_dashboard` (SQL), `FinancialHealthCombined` (TS), `gamification` API (TS), `DashboardScreen` (Dart) |
| **Monthly Income/Expenses** | `get_financial_dashboard` (SQL), `useDashboardData` (TS inline), `gamification` API (TS), `DashboardScreen` (Dart) |
| **Debt Ratio / Monthly Commitments** | `get_financial_dashboard` (SQL), `FinancialHealthCombined` (TS), `gamification` API (TS), `DashboardScreen` (Dart) |
| **Emergency Months** | `get_financial_dashboard` → `goals_saved` / income (SQL), `FinancialHealthCombined` (TS), `gamification` API (TS), `DashboardScreen` (Dart) |
| **Savings Rate** | `calculate_health_score` (SQL), `FinancialHealthCombined` (TS), `gamification` API (TS), `DashboardScreen` (Dart) |
| **Health Score** | `calculate_health_score` (SQL), `FinancialHealthCombined` (TS recalc for roadmap) |
| **Journey Stage** | **Flutter only** (inline Dart), no Web equivalent |
| **Monthly Summary** | `get_monthly_financial_summary` (SQL), `useDashboardData` (TS inline for 6-month chart) |

---

## 8. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **SECURITY DEFINER functions** with owner guards | High | All new RPCs must follow `20260907083248` pattern: `IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN RAISE EXCEPTION` |
| **RLS bypass** via admin client in cron | Medium | Cron routes use `verifyCronAuth` with `timingSafeEqual`; admin client only in server-only modules |
| **Currency calculation divergence** | High | Exchange rate fetched in multiple places (Web: `useDashboardData`, Flutter: `FinanceService`, Cron: inline); must centralize |
| **Historical data integrity** | High | `health_score_history` snapshots must record `threshold_version`; migrations must not alter historical meaning |
| **Performance: N+1 RPC calls** | Medium | `get_financial_dashboard` calls `get_account_balances` internally; new RPC must avoid recursive calls |
| **Backward compatibility** | High | Old RPCs (`get_financial_dashboard`, `calculate_health_score`) must remain functional during migration |
| **Flutter/Web parity** | Medium | TypeScript types and Dart models must stay in sync for new contract |
| **Soft delete / sync conflicts** | Medium | `deleted_at` columns exist; Drift local DB must sync correctly |

---

## 9. Reuse Opportunities (Existing → New Shared Core)

| Existing | Should Become | Notes |
|----------|---------------|-------|
| `get_financial_dashboard` internals | `calculate_financial_metrics()` | Extract the metric computation (income, expenses, net worth, debts, goals, investments) as reusable internal function |
| `calculate_health_score` | `calculate_health_components()` | Refactor to return component scores + drivers + source metrics |
| `get_monthly_financial_summary` | `calculate_monthly_metrics()` | Reuse for weekly/monthly trends |
| `get_account_balances` | Keep as-is | Already clean, used by new metrics |
| `health_score_history` table | Keep, extend | Add `threshold_version`, `calculation_version` columns |
| `user_stats` table | Keep separate | Gamification ≠ Financial Intelligence |
| `DashboardLayoutProvider` / `useDashboardLayout` | Keep | Dashboard customization is orthogonal |

---

## 10. Conflicts with Locked Decisions

| Locked Decision | Current Reality | Conflict |
|-----------------|-----------------|----------|
| **Single authoritative RPC** | 3+ RPCs + inline TS/Dart calculations | Must create `get_financial_journey_state` as new entry point |
| **Thresholds in DB table** | Hardcoded in SQL functions | Must create `financial_thresholds` table and migrate |
| **NBA persistence table** | Does not exist | Must create `financial_recommendations` |
| **Feature flags** | Does not exist | Must create `feature_flags` table + client infra |
| **Health returns components + drivers** | Returns single integer | Must refactor `calculate_health_score` → `calculate_health_components` |
| **Journey stage with gates/milestones** | Flutter inline string only | Must create `calculate_journey_state` |
| **QuickAdd intent contract** | UI + parsing + execution in one component | Must extract parser, define `QuickAddIntent` type |
| **No client recalculation** | Web `FinancialHealthCombined` + Flutter `DashboardScreen` recalculate | Must migrate to selectors over RPC response |

---

## 11. Recommended Phase 0 Changes (Exact Files)

### 11.1 Database Migrations (New Files)

| File | Purpose |
|------|---------|
| `supabase/migrations/20260919000001_financial_thresholds.sql` | Create `financial_thresholds` table + seed v1 policy thresholds |
| `supabase/migrations/20260919000002_feature_flags.sql` | Create `feature_flags` table |
| `supabase/migrations/20260919000003_financial_recommendations.sql` | Create `financial_recommendations` table |
| `supabase/migrations/20260919000004_health_score_history_extend.sql` | Add `threshold_version`, `calculation_version` to `health_score_history` |
| `supabase/migrations/20260919000005_financial_intelligence_core.sql` | Create composable internal functions + `get_financial_journey_state()` public RPC |

### 11.2 TypeScript Types (New/Modified)

| File | Change |
|------|--------|
| `types/financial-intelligence.ts` | **NEW** — `FinancialState`, `HealthState`, `JourneyState`, `NextAction`, `FinancialJourneyResponse`, `QuickAddIntent`, `FeatureFlag` types |
| `types/index.ts` | Re-export new types |
| `lib/schemas/financial-intelligence.ts` | **NEW** — Zod schemas for RPC response validation |

### 11.3 Dart Models (New)

| File | Purpose |
|------|---------|
| `mobile/fajrak_flutter/lib/models/financial_journey.dart` | **NEW** — `FinancialState`, `HealthState`, `JourneyState`, `NextAction`, `FinancialJourneyResponse` models with `fromJson` |
| `mobile/fajrak_flutter/lib/models/quick_add_intent.dart` | **NEW** — `QuickAddIntent` model |

### 11.4 Feature Flag Infrastructure

| File | Purpose |
|------|---------|
| `lib/feature-flags.ts` | **NEW** — Server/client feature flag client with deterministic rollout |
| `hooks/useFeatureFlag.ts` | **NEW** — React hook for feature flags |
| `mobile/fajrak_flutter/lib/services/feature_flag_service.dart` | **NEW** — Dart feature flag client |

### 11.5 Core Calculation Functions (Internal)

| File | Purpose |
|------|---------|
| `supabase/migrations/20260919000005_financial_intelligence_core.sql` | `calculate_financial_metrics()`, `calculate_health_components()`, `calculate_journey_state()`, `calculate_weekly_trends()`, `generate_next_actions()`, `get_financial_journey_state()` |

### 11.6 Test Fixtures

| File | Purpose |
|------|---------|
| `tests/fixtures/financial-intelligence/` | **NEW** — JSON fixtures for each financial scenario with `threshold_version`, `calculation_version`, input, expected output |

### 11.7 Observability

| File | Purpose |
|------|---------|
| `lib/observability/financial-intelligence.ts` | **NEW** — Logging/metrics for old vs new calculation comparison |

---

## 12. Exact Implementation Plan (Phase 0)

### FILE: `supabase/migrations/20260919000001_financial_thresholds.sql`
**CHANGE:** Create `financial_thresholds` table with versioned, time-bounded thresholds. Seed v1 policy thresholds from Q1 decisions.
**WHY:** Single authoritative runtime source for all financial policy thresholds (journey gates, NBA triggers, health components).
**DEPENDENCIES:** None (new table).
**ROLLBACK:** `DROP TABLE financial_thresholds;`

### FILE: `supabase/migrations/20260919000002_feature_flags.sql`
**CHANGE:** Create `feature_flags` table with `key`, `enabled`, `rollout_percentage`, `target_users` (jsonb), `created_at`, `updated_at`. Deterministic rollout via `hash(user_id + flag_key)`.
**WHY:** Required for Strangler Fig migration (Q12) — instant rollback, cohort rollout.
**DEPENDENCIES:** None.
**ROLLBACK:** `DROP TABLE feature_flags;`

### FILE: `supabase/migrations/20260919000003_financial_recommendations.sql`
**CHANGE:** Create `financial_recommendations` table per Q8 schema with lifecycle states, rule_version, priority_score, source_metrics, gamification_bonus_awarded.
**WHY:** NBA persistence with auditability and versioning.
**DEPENDENCIES:** None.
**ROLLBACK:** `DROP TABLE financial_recommendations;`

### FILE: `supabase/migrations/20260919000004_health_score_history_extend.sql`
**CHANGE:** `ALTER TABLE health_score_history ADD COLUMN IF NOT EXISTS threshold_version int DEFAULT 1, ADD COLUMN IF NOT EXISTS calculation_version text DEFAULT 'legacy_1.0';`
**WHY:** Historical auditability — know which policy produced each snapshot.
**DEPENDENCIES:** `health_score_history` exists.
**ROLLBACK:** `ALTER TABLE health_score_history DROP COLUMN threshold_version, DROP COLUMN calculation_version;`

### FILE: `supabase/migrations/20260919000005_financial_intelligence_core.sql`
**CHANGE:** 
1. `calculate_financial_metrics(p_user_id, p_usd_to_local_rate)` → returns `jsonb` with all raw metrics (income, expenses, assets, liabilities, net_worth, debt_ratio, emergency_months, savings_rate, investment_contributions_monthly, transaction_count, active_accounts, active_debts, active_goals)
2. `calculate_health_components(p_metrics jsonb, p_thresholds jsonb)` → returns `jsonb` with `overall`, `components`, `drivers[]`
3. `calculate_journey_state(p_metrics jsonb, p_thresholds jsonb)` → returns `jsonb` with stage, status, progress, milestones, gates
4. `calculate_weekly_trends(p_user_id)` → returns `jsonb` with 7-day aggregates
5. `generate_next_actions(p_metrics jsonb, p_health jsonb, p_journey jsonb, p_thresholds jsonb)` → returns `jsonb[]` of recommendations
6. `get_financial_journey_state(p_user_id uuid, p_usd_to_local_rate double precision DEFAULT 1.0)` → **PUBLIC RPC** orchestrating above, returns full contract per Round 2 Q6.

All internal functions: `SECURITY DEFINER`, `SET search_path = public`, owner guard (`auth.uid()` check).

**WHY:** Composable, testable, single source of truth. Public RPC is thin orchestrator.
**DEPENDENCIES:** `financial_thresholds` table (1), `health_score_history` extension (4).
**ROLLBACK:** `DROP FUNCTION get_financial_journey_state(uuid, double precision); DROP FUNCTION generate_next_actions(...); DROP FUNCTION calculate_weekly_trends(...); DROP FUNCTION calculate_journey_state(...); DROP FUNCTION calculate_health_components(...); DROP FUNCTION calculate_financial_metrics(...);`

### FILE: `types/financial-intelligence.ts`
**CHANGE:** Define all contract types: `FinancialState`, `HealthState`, `JourneyState`, `NextAction`, `FinancialJourneyResponse`, `QuickAddIntent`, `FeatureFlag`, `ThresholdKey`.
**WHY:** Single source of truth for Web types.
**DEPENDENCIES:** None.
**ROLLBACK:** Delete file.

### FILE: `lib/schemas/financial-intelligence.ts`
**CHANGE:** Zod schemas matching `types/financial-intelligence.ts` for runtime validation of RPC responses.
**WHY:** Fail fast on contract drift.
**DEPENDENCIES:** `types/financial-intelligence.ts`.
**ROLLBACK:** Delete file.

### FILE: `mobile/fajrak_flutter/lib/models/financial_journey.dart`
**CHANGE:** Dart models with `fromJson`/`toJson` for all contract types.
**WHY:** Single source of truth for Flutter types.
**DEPENDENCIES:** None.
**ROLLBACK:** Delete file.

### FILE: `lib/feature-flags.ts` + `hooks/useFeatureFlag.ts`
**CHANGE:** Server-side `getFeatureFlags(userId)` fetches flags, evaluates deterministic rollout (`hash(user_id + key) % 100 < rollout_percentage`). Client hook caches 5min, defaults `false`.
**WHY:** Migration safety (Q15).
**DEPENDENCIES:** `feature_flags` table (2).
**ROLLBACK:** Delete files, remove hook usage.

### FILE: `mobile/fajrak_flutter/lib/services/feature_flag_service.dart`
**CHANGE:** Dart equivalent of feature flag client with deterministic rollout.
**WHY:** Flutter parity for migration flags.
**DEPENDENCIES:** `feature_flags` table (2).
**ROLLBACK:** Delete file.

### FILE: `tests/fixtures/financial-intelligence/`
**CHANGE:** JSON fixtures covering: empty user, zero income, positive/negative cash flow, no debt, overdue debt, high debt, emergency fund 0/1m/3m, savings rate 0%/10%, negative net worth, multi-currency, insufficient data, journey boundaries, NBA trigger/no-trigger.
**WHY:** Contract validation for all layers.
**DEPENDENCIES:** None.
**ROLLBACK:** Delete directory.

### FILE: `lib/observability/financial-intelligence.ts`
**CHANGE:** `logFinancialCalculation({ userId, calculationVersion, thresholdVersion, oldRpc: get_financial_dashboard, newRpc: get_financial_journey_state, metricsComparison })` for side-by-side comparison during migration.
**WHY:** Verify parity before switching consumers.
**DEPENDENCIES:** None.
**ROLLBACK:** Delete file.

---

## 13. Files NOT Modified in Phase 0

| File | Reason |
|------|--------|
| `hooks/useDashboardData.ts` | Consumer migration = Phase 1 |
| `components/ui/financial-health-combined.tsx` | Consumer migration = Phase 1 |
| `app/(dashboard)/dashboard/page.tsx` | Consumer migration = Phase 1 |
| `mobile/fajrak_flutter/lib/screens/dashboard/dashboard_screen.dart` | Consumer migration = Phase 1 |
| `mobile/fajrak_flutter/lib/widgets/dashboard/dashboard_health_score.dart` | Consumer migration = Phase 1 |
| `mobile/fajrak_flutter/lib/services/finance_service.dart` | Consumer migration = Phase 1 |
| `app/api/health-score-snapshot/route.ts` | Background job migration = Phase 1 |
| `app/api/gamification/route.ts` | Background job migration = Phase 1 |
| `supabase/migrations/legacy/035_dashboard_rpc_consolidate.sql` | Legacy RPC preserved for compatibility |
| `supabase/migrations/legacy/026_centralized_health_score.sql` | Legacy function preserved for compatibility |

---

## 14. Approval Required

**Do not implement until this audit and plan are approved.**

Next step after approval: Create the 5 database migrations (11.1), then TypeScript/Dart types (11.2-11.3), then core SQL functions (11.5), then feature flags (11.4), then test fixtures (11.6), then observability (11.7).