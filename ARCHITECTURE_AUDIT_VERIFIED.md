# Verified Calculation Inventory — Fajrak Financial Journey 2.0
**Date:** 2026-09-19  
**Phase:** Pre-Phase 0 Verification Pass (No migrations yet)

---

## 1. Verified Calculation Inventory

For each calculation: exact file, function/component, line range, formula, source data.

### 1.1 Net Worth

| Location | File | Function/Component | Lines | Formula | Source |
|----------|------|-------------------|-------|---------|--------|
| **SQL (Authoritative)** | `supabase/migrations/20260907083248_verify_owner_in_user_rpcs.sql` | `get_financial_dashboard` | 67-82 | `accounts_balance + investments_usd * rate + investment_cash * rate + goals_saved + receivable - debt_owed` | `get_account_balances`, `investments`, `investment_cash`, `savings_goals`, `debts` |
| **Web TS (Derived)** | `hooks/useDashboardData.ts` | `useDashboardData` | 102 | `Number(dashData?.net_worth ?? 0)` | RPC `get_financial_dashboard` |
| **Web Component (Duplicate)** | `components/ui/financial-health-combined.tsx` | `loadRoadmap` | 142-148 | `personalAssets + totalInvested + totalSavings - totalDebt` | Direct Supabase queries: `profiles` (assets), `investments`, `savings_goals`, `debts` |
| **Flutter (Derived)** | `mobile/fajrak_flutter/lib/screens/dashboard/dashboard_screen.dart` | `_loadPhase2` | 182 | `(dash['net_worth'] as num).toDouble()` | RPC `get_financial_dashboard` |
| **Cron/API (Duplicate)** | `app/api/gamification/route.ts` | `POST` | 138-142 | `personalAssets + invValue + totalSavings - totalDebt` | Direct Supabase queries: `profiles`, `investments`, `savings_goals`, `debts` |

**Verdict:** 5 implementations. SQL RPC is authoritative. Web component, gamification API recalculate independently.

---

### 1.2 Monthly Income

| Location | File | Function/Component | Lines | Formula | Source |
|----------|------|-------------------|-------|---------|--------|
| **SQL (Authoritative)** | `supabase/migrations/legacy/026_centralized_health_score.sql` | `calculate_health_score` | 22-31 | `SUM(CASE WHEN type='income' THEN amount ELSE 0 END) WHERE transaction_date >= first_day_of_month` FALLBACK `profiles.monthly_income` | `transactions`, `profiles` |
| **SQL (Authoritative)** | `supabase/migrations/legacy/033_unified_monthly_financial_summary.sql` | `get_monthly_financial_summary` | 13-19 | `SUM(CASE WHEN type='income' THEN amount ELSE 0 END) WHERE year/month match` | `transactions` |
| **Web TS (Derived)** | `hooks/useDashboardData.ts` | `useDashboardData` | 78-85 | `currentMonthTxs.filter(type='income').reduce(sum) || profile.monthly_income` | Direct `transactions` query + `profiles` |
| **Flutter (Derived)** | `mobile/fajrak_flutter/lib/screens/dashboard/dashboard_screen.dart` | `_loadPhase2` | 150-156 | `monthly['income']` from RPC `get_monthly_financial_summary` FALLBACK inline calc | RPC + fallback to direct `transactions` query |
| **Cron/API (Duplicate)** | `app/api/gamification/route.ts` | `POST` | 98-100 | `txs.filter(type='income' && date>=firstOfMonth).reduce(sum) || profile.monthly_income` | Direct `transactions` + `profiles` |
| **Cron/API (Duplicate)** | `app/api/health-score-snapshot/route.ts` | `snapshotScores` | 18-22 | `txIncome > 0 ? txIncome : income` | Direct `transactions` + `profiles.monthly_income` |
| **Cron/API (Duplicate)** | `app/api/daily-reminder/route.ts` | `sendDailyReminders` | 42-48 | `profile.monthly_income` | Direct `profiles` |

**Verdict:** 7 implementations. SQL functions are authoritative but differ: `calculate_health_score` uses current month from `now()`, `get_monthly_financial_summary` uses parameterized year/month. Web/Flutter/Cron all recalculate inline.

---

### 1.3 Monthly Expenses

| Location | File | Function/Component | Lines | Formula | Source |
|----------|------|-------------------|-------|---------|--------|
| **SQL (Authoritative)** | `supabase/migrations/legacy/026_centralized_health_score.sql` | `calculate_health_score` | 22-31 | `SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) WHERE transaction_date >= first_day_of_month` | `transactions` |
| **SQL (Authoritative)** | `supabase/migrations/legacy/033_unified_monthly_financial_summary.sql` | `get_monthly_financial_summary` | 13-19 | `SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) WHERE year/month match` | `transactions` |
| **Web TS (Derived)** | `hooks/useDashboardData.ts` | `useDashboardData` | 85-87 | `currentMonthTxs.filter(type='expense').reduce(sum)` | Direct `transactions` query |
| **Flutter (Derived)** | `mobile/fajrak_flutter/lib/screens/dashboard/dashboard_screen.dart` | `_loadPhase2` | 156-158 | `monthly['expenses']` from RPC FALLBACK inline calc | RPC + fallback |
| **Cron/API (Duplicate)** | `app/api/gamification/route.ts` | `POST` | 100-101 | `txs.filter(type='expense' && date>=firstOfMonth).reduce(sum)` | Direct `transactions` |
| **Cron/API (Duplicate)** | `app/api/health-score-snapshot/route.ts` | `snapshotScores` | 22-24 | `txs.filter(type='expense').reduce(sum)` | Direct `transactions` |
| **Cron/API (Duplicate)** | `app/api/daily-reminder/route.ts` | `sendDailyReminders` | 50-54 | `txData.filter(type='expense').reduce(sum)` | Direct `transactions` |

**Verdict:** 7 implementations. Same pattern as income.

---

### 1.4 Cash Flow (Income - Expenses)

| Location | File | Function/Component | Lines | Formula | Source |
|----------|------|-------------------|-------|---------|--------|
| **Web TS (Derived)** | `hooks/useDashboardData.ts` | `useDashboardData` | 98 | `income - expenses` | Inline from above |
| **Flutter (Derived)** | `mobile/fajrak_flutter/lib/screens/dashboard/dashboard_screen.dart` | `_loadPhase2` | 159 | `monthly['net']` (which is `income - expenses - debt_payments`) | RPC |
| **SQL (Authoritative)** | `supabase/migrations/legacy/033_unified_monthly_financial_summary.sql` | `get_monthly_financial_summary` | 23 | `v_income - v_expenses - v_debt_payments` | Includes debt payments! |
| **Web Component (Duplicate)** | `components/ui/financial-health-combined.tsx` | `calcHealthScore` | 18-20 | `(p.income - p.expenses) / p.income` | Props from `useDashboardData` |

**Verdict:** 4 implementations. SQL `get_monthly_financial_summary` includes debt payments in net; others don't. Inconsistent definition.

---

### 1.5 Savings Rate

| Location | File | Function/Component | Lines | Formula | Source |
|----------|------|-------------------|-------|---------|--------|
| **SQL (Authoritative)** | `supabase/migrations/legacy/026_centralized_health_score.sql` | `calculate_health_score` | 34-39 | `(v_income - v_expenses) / v_income` | Current month income/expenses |
| **Web Component (Duplicate)** | `components/ui/financial-health-combined.tsx` | `calcHealthScore` | 18-20 | `(p.income - p.expenses) / p.income` | Props |
| **Cron/API (Duplicate)** | `app/api/gamification/route.ts` | `POST` | 102-103 | `((monthIncome - monthExpenses) / monthIncome) * 100` | Direct queries |
| **Cron/API (Duplicate)** | `app/api/health-score-snapshot/route.ts` | `snapshotScores` | — | Not calculated separately | — |

**Thresholds (Hardcoded in SQL):**
- `calculate_health_score` lines 36-38: `>= 0.2` (30pts), `>= 0.1` (20pts), `> 0` (10pts)
- `gamification` badges: `saver_10` >= 10%, `saver_20` >= 20%, `saver_30` >= 30%

**Verdict:** 3 implementations with same formula but different thresholds in different places.

---

### 1.6 Debt Ratio

| Location | File | Function/Component | Lines | Formula | Source |
|----------|------|-------------------|-------|---------|--------|
| **SQL (Authoritative)** | `supabase/migrations/legacy/026_centralized_health_score.sql` | `calculate_health_score` | 43-51 | `v_total_debt / (v_income * 12)` | `debts.remaining_amount` sum / annualized income |
| **Web Component (Duplicate)** | `components/ui/financial-health-combined.tsx` | `calcHealthScore` | 23-25 | `p.totalDebt / (p.income * 12)` | Props |
| **Flutter (Derived + Duplicate)** | `mobile/fajrak_flutter/lib/screens/dashboard/dashboard_screen.dart` | `_loadPhase2` | 194-196 | `totalMonthly / income > 0.3` for stage logic | Direct `debts` query + income |
| **Cron/API (Duplicate)** | `app/api/gamification/route.ts` | `POST` | — | Not calculated as ratio | — |

**Thresholds (Hardcoded):**
- `calculate_health_score` lines 45-49: `= 0` (25pts), `< 0.3` (20pts), `< 0.6` (10pts)
- `gamification` badges: none for debt ratio
- Flutter stage: `> 0.3` (30%) triggers 'debt' stage

**Verdict:** 3 implementations. Flutter uses monthly payment ratio, SQL uses total remaining debt ratio. Different formulas!

---

### 1.7 Emergency Fund Months

| Location | File | Function/Component | Lines | Formula | Source |
|----------|------|-------------------|-------|---------|--------|
| **SQL (Authoritative)** | `supabase/migrations/legacy/026_centralized_health_score.sql` | `calculate_health_score` | 54-61 | `v_goals_saved / (v_income * 3)` | `savings_goals.current_amount` sum / (monthly_income * 3) |
| **Web Component (Duplicate)** | `components/ui/financial-health-combined.tsx` | `loadRoadmap` | 132-133 | `totalSavings >= monthlyExpenses * 3` | `savings_goals` sum vs `monthlyExpenses * 3` |
| **Flutter (Derived)** | `mobile/fajrak_flutter/lib/screens/dashboard/dashboard_screen.dart` | `_loadPhase2` | 190-192 | `goalsSaved < income * 3` for stage logic | RPC `goals_saved` vs `income * 3` |
| **Cron/API (Duplicate)** | `app/api/gamification/route.ts` | `POST` | 130-131 | `totalSavings >= emergencyTarget && emergencyTarget > 0` where `emergencyTarget = monthExpenses * 3` | Direct queries |
| **Cron/API (Duplicate)** | `app/api/health-score-snapshot/route.ts` | `snapshotScores` | — | Stores `goals_saved` but doesn't calculate ratio | — |

**Thresholds (Hardcoded):**
- `calculate_health_score` lines 56-60: `>= 1.0` (20pts), `>= 0.5` (12pts), `> 0` (6pts)
- `gamification` badge `emergency`: `totalSavings >= monthExpenses * 3`
- Flutter stage: `goalsSaved < income * 3` triggers 'emergency' stage
- Web component: `totalSavings >= monthlyExpenses * 3`

**Verdict:** 5 implementations. Some use `income * 3`, others `expenses * 3` as denominator. Inconsistent!

---

### 1.8 Health Score

| Location | File | Function/Component | Lines | Formula | Source |
|----------|------|-------------------|-------|---------|--------|
| **SQL (Authoritative)** | `supabase/migrations/legacy/026_centralized_health_score.sql` | `calculate_health_score` | 15-78 | Component scoring (see below) | All tables |
| **Web Component (Duplicate)** | `components/ui/financial-health-combined.tsx` | `calcHealthScore` | 18-43 | Nearly identical but: savings rate uses `props`, debt ratio uses `props.totalDebt`, emergency uses `props.goalsSaved` | Props from `useDashboardData` |
| **Flutter (Derived)** | `mobile/fajrak_flutter/lib/widgets/dashboard/dashboard_health_score.dart` | `_loadHistory` + display | 35-45 | Reads `health_score` from RPC `get_financial_dashboard` which calls `calculate_health_score` | RPC |

**Component Breakdown (SQL `calculate_health_score`):**
| Component | Threshold | Points |
|-----------|-----------|--------|
| Savings Rate | >= 20% | 30 |
| Savings Rate | >= 10% | 20 |
| Savings Rate | > 0% | 10 |
| Debt Ratio | = 0% | 25 |
| Debt Ratio | < 30% | 20 |
| Debt Ratio | < 60% | 10 |
| Emergency Ratio | >= 100% | 20 |
| Emergency Ratio | >= 50% | 12 |
| Emergency Ratio | > 0% | 6 |
| Investments | > 0 | 15 |
| Transaction Count (30d) | >= 10 | 10 |
| Transaction Count (30d) | >= 5 | 6 |
| Transaction Count (30d) | > 0 | 3 |

**Web Component Differences:**
- Savings rate: same thresholds
- Debt ratio: uses `props.totalDebt` (from RPC `total_debt_owed`) vs SQL `v_total_debt` (same)
- Emergency: uses `props.goalsSaved / (props.income * 3)` vs SQL `v_goals_saved / (v_income * 3)` — same but `v_income` falls back to `profiles.monthly_income`
- Transaction count: Web uses `props.txCount` (from 6-month window) vs SQL (30-day window)

**Verdict:** 2 authoritative implementations (SQL + Web component near-clone). Flutter derives from RPC. Web component has subtle differences in time windows and fallback income.

---

### 1.9 Journey Stage

| Location | File | Function/Component | Lines | Formula | Source |
|----------|------|-------------------|-------|---------|--------|
| **Flutter Only** | `mobile/fajrak_flutter/lib/screens/dashboard/dashboard_screen.dart` | `_loadPhase2` | 194-200 | `if (totalDebt > 0 && income > 0 && totalMonthly/income > 0.3) 'debt' else if (totalDebt == 0 && goalsSaved < income*3) 'emergency' else if (invValue > 0) 'investing' else 'awareness'` | Direct queries + RPC |
| **Web Component (Duplicate)** | `components/ui/financial-health-combined.tsx` | `loadRoadmap` | 136-140 | `if (!isTracking) 1 else if (debtRatio>=35) 2 else if (debtRatio<35) 3 else if (hasEmergencyFund) 4 else if (isInvesting) 5` | Direct queries |

**Verdict:** 2 implementations, Flutter-only in screen, Web-only in component. No shared logic. Different thresholds (0.3 vs 35% — same but expressed differently).

---

## 2. Existing SQL Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXISTING RPC CALL GRAPH                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  get_financial_dashboard(p_user_id, p_usd_to_local_rate)       │
│       │                                                         │
│       ├── get_account_balances(p_user_id) ────────────────────┐ │
│       │       │                                               │ │
│       │       └── accounts + transactions (income/expense/    │ │
│       │           transfer) → current_balance per account     │ │
│       │                                                       │ │
│       ├── investments (shares * current_price)                │ │
│       ├── investment_cash (balance)                           │ │
│       ├── savings_goals (current_amount, target_amount)       │ │
│       ├── debts (remaining_amount, monthly_payment,           │ │
│       │       debt_type, auto_deduct)                         │ │
│       ├── alerts (is_read)                                    │ │
│       └── calculate_health_score(p_user_id, p_usd_to_local_rate) │
│               │                                               │
│               ├── transactions (current month income/expense) │
│               ├── profiles (monthly_income fallback)          │
│               ├── debts (remaining_amount, debt_type='owed')  │
│               ├── savings_goals (current_amount)              │
│               └── investments (shares * current_price)        │
│                                                                 │
│  get_monthly_financial_summary(p_user_id, p_year, p_month)   │
│       │                                                         │
│       ├── transactions (income/expense for year/month)        │
│       └── debts (monthly_payment where is_paid=false)         │
│                                                                 │
│  get_account_balances(p_user_id)                              │
│       │                                                         │
│       ├── accounts                                              │
│       └── transactions (income/expense/transfer per account)  │
│                                                                 │
│  calculate_health_score(p_user_id, p_usd_to_local_rate)       │
│       │  (called by get_financial_dashboard, health-score-    │
│       │   snapshot cron, FinancialHealthCombined fallback)    │
│       ├── transactions (current month + 30-day window)        │
│       ├── profiles (monthly_income fallback)                  │
│       ├── debts (remaining_amount, debt_type='owed')          │
│       ├── savings_goals (current_amount)                      │
│       └── investments (shares * current_price)                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key Observations:**
1. `get_financial_dashboard` calls `get_account_balances` AND `calculate_health_score` internally
2. `calculate_health_score` is called by: `get_financial_dashboard`, `health-score-snapshot` cron, `FinancialHealthCombined` (fallback)
3. `get_monthly_financial_summary` is independent but duplicates transaction aggregation logic
4. No shared internal calculation functions — each RPC re-queries tables

---

## 3. Health Score Threshold Inventory

| Threshold | Current Value | Location | What It Affects | Changing Alters Historical Scores? | Recommendation |
|-----------|---------------|----------|-----------------|-----------------------------------|----------------|
| Savings Rate ≥ 20% | 0.20 | `calculate_health_score` L36 | +30 pts | **YES** — changes score for all users | **Versioned DB threshold** |
| Savings Rate ≥ 10% | 0.10 | `calculate_health_score` L37 | +20 pts | **YES** | **Versioned DB threshold** |
| Savings Rate > 0% | 0.00 | `calculate_health_score` L38 | +10 pts | **YES** | **Versioned DB threshold** |
| Debt Ratio = 0% | 0.00 | `calculate_health_score` L45 | +25 pts | **YES** | **Versioned DB threshold** |
| Debt Ratio < 30% | 0.30 | `calculate_health_score` L46 | +20 pts | **YES** | **Versioned DB threshold** |
| Debt Ratio < 60% | 0.60 | `calculate_health_score` L47 | +10 pts | **YES** | **Versioned DB threshold** |
| Emergency Ratio ≥ 100% | 1.00 | `calculate_health_score` L56 | +20 pts | **YES** | **Versioned DB threshold** |
| Emergency Ratio ≥ 50% | 0.50 | `calculate_health_score` L57 | +12 pts | **YES** | **Versioned DB threshold** |
| Emergency Ratio > 0% | 0.01 | `calculate_health_score` L58 | +6 pts | **YES** | **Versioned DB threshold** |
| Savings Rate ≥ 10% | 10 | `gamification` badge `saver_10` | Badge unlock | **YES** — retroactive badge grant | **Versioned DB threshold** |
| Savings Rate ≥ 20% | 20 | `gamification` badge `saver_20` | Badge unlock | **YES** | **Versioned DB threshold** |
| Savings Rate ≥ 30% | 30 | `gamification` badge `saver_30` | Badge unlock | **YES** | **Versioned DB threshold** |
| Emergency Fund | 3 months expenses | `gamification` badge `emergency` | Badge unlock | **YES** | **Versioned DB threshold** |
| Emergency Fund | 1 month income | Flutter stage 'emergency' | Stage gate | **YES** | **Versioned DB threshold** |
| Emergency Fund | 3 months income | Journey Stage 3 completion | Stage gate | **YES** | **Versioned DB threshold** |
| Debt Ratio > 30% | 0.30 | Flutter stage 'debt' | Stage gate | **YES** | **Versioned DB threshold** |
| DTI ≤ 36% | 0.36 | Journey Stage 2 completion (Q1) | Stage gate | **YES** | **Versioned DB threshold** |

**Critical Finding:** ALL health-score thresholds are hardcoded in SQL/function logic. Changing any alters scores for existing users immediately. Must be versioned in DB with `threshold_version` recorded in `health_score_history`.

---

## 4. Currency/Conversion Inventory

### 4.1 Exchange Rate Sources

| Location | File | Method | Base → Target | Caching |
|----------|------|--------|---------------|---------|
| **Web API** | `app/api/exchange-rate/route.ts` | `fetch('https://open.er-api.com/v6/latest/${base}')` | Any → Any | `next: { revalidate: 3600 }` (Next.js cache) |
| **Web Client** | `lib/currency.ts` | `fetch('/api/exchange-rate?base=USD&target=JOD')` | USD → User currency | TanStack Query (staleTime: 0) |
| **Flutter** | `mobile/fajrak_flutter/lib/services/currency_service.dart` | `http.get('https://open.er-api.com/v6/latest/${base}')` | Any → Any | None (per-call) |
| **RPC Parameter** | `get_financial_dashboard`, `get_zakat_summary` | `p_usd_to_local_rate` passed by caller | USD → Local | Caller responsibility |

### 4.2 Conversion Flow

```
Web Dashboard:
1. useDashboardData reads profile.currency (e.g., 'JOD')
2. fetchExchangeRate('USD', 'JOD') → rate
3. Calls get_financial_dashboard(p_usd_to_local_rate: rate)
4. RPC multiplies USD values by rate

Flutter Dashboard:
1. FinanceService reads profile.currency
2. CurrencyService.fetchExchangeRate('USD', currency) → rate
3. Calls fetchFinancialDashboard(usdToLocalRate: rate)
4. RPC multiplies USD values by rate

Zakat Calculator:
1. Fetches gold/silver prices (separate APIs)
2. Fetches USD → local rate
3. Calls get_zakat_summary with all three rates

Investments:
- Stored in USD (shares * current_price in USD)
- Converted at display time via p_usd_to_local_rate
- investment_cash stored per-currency, converted at display
```

### 4.3 Currency Inconsistencies

| Issue | Locations | Impact |
|-------|-----------|--------|
| **Double conversion risk** | Web: `useDashboardData` calls RPC twice if rate ≠ 1 (lines 68-75) | Extra RPC call, potential rate drift between calls |
| **Different base currencies** | Web defaults to USD; Flutter uses USD; Zakat uses USD | Consistent but not documented |
| **No rate in health_score_history** | `health-score-snapshot` stores `income`, `expenses` in local? unclear | Historical comparison across currency changes broken |
| **Transaction original_currency** | Transactions store `original_currency`, `exchange_rate` | Good — preserves original |
| **Debt currency** | Debts have `currency`, `exchange_rate`, `remaining_amount_foreign` | Good — supports multi-currency debt |

---

## 5. Health Score History Lifecycle

### 5.1 Table Definition
```sql
-- From legacy/007_health_score_history.sql + 20260913135653_add_prod_only_schema.sql
CREATE TABLE public.health_score_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  score int NOT NULL,
  income numeric DEFAULT 0,
  expenses numeric DEFAULT 0,
  total_debt numeric DEFAULT 0,
  inv_value numeric DEFAULT 0,
  goals_saved numeric DEFAULT 0,
  recorded_at date NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(user_id, recorded_at)
);
```

### 5.2 Writers
| Writer | File | Method | Frequency |
|--------|------|--------|-----------|
| `health-score-snapshot` cron | `app/api/health-score-snapshot/route.ts` | `snapshotScores()` → `upsert` | Daily (cron) |
| `gamification` API | `app/api/gamification/route.ts` | Does NOT write history | — |

### 5.3 Readers
| Reader | File | Method |
|--------|------|--------|
| `FinancialHealthCombined` (History tab) | `components/ui/financial-health-combined.tsx` | `loadHistory()` → `select recorded_at, score` |
| `DashboardHealthScore` (Flutter) | `mobile/fajrak_flutter/lib/widgets/dashboard/dashboard_health_score.dart` | `_loadHistory()` → `select recorded_at, score` |

### 5.4 Semantics
- `recorded_at` = **snapshot date** (CURRENT_DATE at cron execution), not calculation timestamp
- One row per user per day (enforced by UNIQUE constraint)
- Stores raw metrics at time of snapshot: `income`, `expenses`, `total_debt`, `inv_value`, `goals_saved`
- **Missing:** `threshold_version`, `calculation_version` — cannot distinguish which policy produced historical scores

### 5.5 Compatibility Requirements
- Existing rows must remain semantically valid
- Adding columns must be `ADD COLUMN IF NOT EXISTS` with defaults
- Cannot change meaning of existing `score` column
- New `threshold_version` default = 1 for historical rows

---

## 6. Feature Flags — Confirmed Absent

**Grep Results:** No `feature_flag`, `featureFlag`, `feature_flags` in application code (excluding node_modules).

**Conclusion:** Must create from scratch in Phase 0.

---

## 7. Financial Thresholds — Complete Proposed List

### 7.1 Journey Policy Thresholds (from Q1)

| Key | Value | Type | Description | Versioned? |
|-----|-------|------|-------------|------------|
| `DTI_STAGE_2` | 0.36 | ratio | Debt-to-income for Debt Freedom completion | YES |
| `EMERGENCY_FUND_STAGE_3_M1` | 1.0 | months | Milestone 1: Emergency fund ≥ 1 month | YES |
| `EMERGENCY_FUND_STAGE_3_M2` | 2.0 | months | Milestone 2: Emergency fund ≥ 2 months | YES |
| `EMERGENCY_FUND_STAGE_3_M3` | 3.0 | months | Stage 3 completion: Emergency fund ≥ 3 months | YES |
| `SAVINGS_RATE_TARGET` | 0.10 | rate | Target savings rate for sustained saving | YES |
| `SAVINGS_CONSISTENCY_MONTHS` | 3 | count | Consecutive months at target savings rate | YES |
| `AWARENESS_MIN_TRANSACTIONS` | 5 | count | Minimum transactions for Awareness completion | YES |
| `AWARENESS_MIN_DAYS` | 14 | count | Minimum days of financial data for Awareness | YES |

### 7.2 Health Scoring Thresholds (from SQL + Gamification)

| Key | Value | Type | Current Location | Description | Versioned? |
|-----|-------|------|------------------|-------------|------------|
| `HEALTH_SR_30` | 0.20 | rate | `calculate_health_score` L36 | Savings rate ≥ 20% = 30 pts | YES |
| `HEALTH_SR_20` | 0.10 | rate | `calculate_health_score` L37 | Savings rate ≥ 10% = 20 pts | YES |
| `HEALTH_SR_10` | 0.01 | rate | `calculate_health_score` L38 | Savings rate > 0% = 10 pts | YES |
| `HEALTH_DR_25` | 0.00 | ratio | `calculate_health_score` L45 | Debt ratio = 0 = 25 pts | YES |
| `HEALTH_DR_20` | 0.30 | ratio | `calculate_health_score` L46 | Debt ratio < 30% = 20 pts | YES |
| `HEALTH_DR_10` | 0.60 | ratio | `calculate_health_score` L47 | Debt ratio < 60% = 10 pts | YES |
| `HEALTH_EF_20` | 1.00 | ratio | `calculate_health_score` L56 | Emergency ratio ≥ 100% = 20 pts | YES |
| `HEALTH_EF_12` | 0.50 | ratio | `calculate_health_score` L57 | Emergency ratio ≥ 50% = 12 pts | YES |
| `HEALTH_EF_6` | 0.01 | ratio | `calculate_health_score` L58 | Emergency ratio > 0% = 6 pts | YES |
| `HEALTH_INV_15` | 1 | flag | `calculate_health_score` L63 | Has investments = 15 pts | YES (bool) |
| `HEALTH_TX_10` | 10 | count | `calculate_health_score` L70 | Tx count ≥ 10 = 10 pts | YES |
| `HEALTH_TX_6` | 5 | count | `calculate_health_score` L71 | Tx count ≥ 5 = 6 pts | YES |
| `HEALTH_TX_3` | 1 | count | `calculate_health_score` L72 | Tx count > 0 = 3 pts | YES |
| `GAMIF_SR_10` | 10 | percent | `gamification` badge `saver_10` | Savings rate ≥ 10% badge | YES |
| `GAMIF_SR_20` | 20 | percent | `gamification` badge `saver_20` | Savings rate ≥ 20% badge | YES |
| `GAMIF_SR_30` | 30 | percent | `gamification` badge `saver_30` | Savings rate ≥ 30% badge | YES |
| `GAMIF_EF_3M` | 3.0 | months | `gamification` badge `emergency` | Emergency fund ≥ 3 months expenses | YES |

---

## 8. NBA Table — Phase 0 Decision

**Decision:** **DEFER `financial_recommendations` table to Phase 1.**

**Reasoning:**
- Phase 0 goal: Authoritative financial intelligence contract (`get_financial_journey_state`)
- NBA generation (`generate_next_actions`) depends on: Health components, Journey state, Thresholds
- Without validated Health/Journey/Threshold contracts, NBA schema is premature
- Phase 0 delivers the **data foundation**; Phase 1 consumes it for NBA + UI migration
- Adding empty table now creates migration debt without value

**Phase 1 will add:**
- `financial_recommendations` table
- `generate_next_actions()` internal function
- `next_actions` in RPC response
- Web/Flutter NBA UI components

---

## 9. Revised Phase 0 File List

### Database Migrations (5 files)

| # | File | Purpose | Risk |
|---|------|---------|------|
| 1 | `20260919000001_financial_thresholds.sql` | Create versioned thresholds table + seed v1 | Low |
| 2 | `20260919000002_feature_flags.sql` | Create feature flags table | Low |
| 3 | `20260919000003_health_score_history_extend.sql` | Add `threshold_version`, `calculation_version` columns | Low |
| 4 | `20260919000004_financial_intelligence_core.sql` | **Internal functions only** (see below) | Medium |
| 5 | `20260919000005_get_financial_journey_state.sql` | Public RPC orchestrating internal functions | Medium |

### 4. Internal Functions (in migration #4)

| Function | Reuse/Adapt/Replace | Source |
|----------|---------------------|--------|
| `calculate_financial_metrics(p_user_id, p_usd_to_local_rate)` | **ADAPT** from `get_financial_dashboard` internals + `get_monthly_financial_summary` | Extract metric computation, return jsonb |
| `calculate_health_components(p_metrics jsonb, p_thresholds jsonb)` | **REPLACE** `calculate_health_score` | Return components + drivers + source metrics |
| `calculate_journey_state(p_metrics jsonb, p_thresholds jsonb)` | **NEW** | Stage, progress, gates, milestones |
| `calculate_weekly_trends(p_user_id)` | **ADAPT** from `useDashboardData` months6 logic + cron patterns | 7-day aggregates |
| `generate_next_actions(p_metrics, p_health, p_journey, p_thresholds)` | **NEW** (Phase 1) | Stub returning `[]` in Phase 0 |

### TypeScript/Dart Contracts

| File | Purpose |
|------|---------|
| `types/financial-intelligence.ts` | `FinancialState`, `HealthState`, `JourneyState`, `FinancialJourneyResponse`, `QuickAddIntent`, `FeatureFlag` |
| `lib/schemas/financial-intelligence.ts` | Zod schemas for RPC response validation |
| `mobile/fajrak_flutter/lib/models/financial_journey.dart` | Dart models with `fromJson` |

### Feature Flags

| File | Purpose |
|------|---------|
| `lib/feature-flags.ts` + `hooks/useFeatureFlag.ts` | Deterministic rollout (`hash(user_id + key) % 100 < rollout_pct`) |
| `mobile/fajrak_flutter/lib/services/feature_flag_service.dart` | Dart equivalent |

### Test Fixtures

| File | Purpose |
|------|---------|
| `tests/fixtures/financial-intelligence/*.json` | Input state + expected output per scenario, tagged with `threshold_version`, `calculation_version` |

### Observability

| File | Purpose |
|------|---------|
| `lib/observability/financial-intelligence.ts` | Side-by-side logging: old RPC vs new RPC metrics comparison |

---

## 10. Files NOT Touched in Phase 0

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
| `supabase/migrations/legacy/035_dashboard_rpc_consolidate.sql` | Legacy RPC preserved |
| `supabase/migrations/legacy/026_centralized_health_score.sql` | Legacy function preserved |

---

## 11. Approval Gate

**This verification pass is complete. Awaiting approval before any implementation.**

**Review Checklist:**
- [ ] Calculation inventory matches your understanding
- [ ] Dependency graph shows correct reuse targets
- [ ] Health score thresholds correctly identified as versioned
- [ ] Currency flow documented and consistent
- [ ] Health score history lifecycle understood
- [ ] NBA table correctly deferred
- [ ] Phase 0 scope is non-breaking (additive only)
- [ ] Rollback procedures defined for each migration

**Once approved, I will implement Phase 0 in order:**
1. Migration 1: `financial_thresholds`
2. Migration 2: `feature_flags`
3. Migration 3: `health_score_history` extension
4. Migration 4: Internal calculation functions
5. Migration 5: `get_financial_journey_state` public RPC
6. TypeScript types + Zod schemas
7. Dart models
8. Feature flag infrastructure
9. Test fixtures
10. Observability helper