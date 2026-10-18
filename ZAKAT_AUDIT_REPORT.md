# Zakat Calculation Engine — Audit Report (Path B: Unification)

**Date:** 2026-10-18
**Status:** READ-ONLY investigation — no source code, SQL, or tests were modified.
**Supabase project inspected:** `fajrak` (`ujwcvtpwsaidljecqbaa`, ap-northeast-1, ACTIVE_HEALTHY)

---

## Executive Summary

Zakat logic currently exists in **four independent places**:

| # | Location | What it computes |
|---|----------|------------------|
| 1 | PostgreSQL RPC `public.get_zakat_summary` | Nisab, zakatable assets, zakat due (snapshot only) |
| 2 | Web — `app/(dashboard)/dashboard/zakat/page.tsx` (TypeScript) | Re-implements the final 2.5% & eligibility math locally; adds gold/silver manually; own Hawl logic |
| 3 | Mobile — `mobile/fajrak_flutter/lib/screens/more/zakat_calculator_screen.dart` (Dart) | Re-implements **the entire engine** locally (Nisab, eligibility, 2.5%) — the RPC wrapper service exists but is **never called** |
| 4 | Server cron — `app/api/zakat-reminder/route.ts` (TypeScript) | Third Hawl implementation (with a bug — see §2.5) |

The clients do not merely display the RPC result — they **override** it with local math. The mobile app in particular ignores the RPC entirely despite a ready-made service method (`FinanceService.fetchZakatSummary`) sitting unused in `lib/services/finance_service.dart`.

---

## Step 1 — Discovery Results

### 1.1 Database (SQL)

```
supabase/migrations/legacy/006_zakat_history.sql                      — zakat_history table + RLS
supabase/migrations/legacy/021_accounting_logic_functions.sql:106     — original get_zakat_summary()
supabase/migrations/legacy/010_fix_rls_performance.sql:145            — RLS policy refresh
supabase/migrations/legacy/022_security_hardening.sql:24              — function hardening
supabase/migrations/legacy/030_fix_function_search_path.sql:10        — search_path fix
supabase/migrations/20260907082428_revoke_public_from_secdef_functions.sql:83 — REVOKE/GRANT
supabase/migrations/20260907081557_advisor_function_lockdown.sql:105  — REVOKE/GRANT
supabase/migrations/20260907083248_verify_owner_in_user_rpcs.sql:152  — latest CREATE OR REPLACE (adds auth.uid() check)
```

Only **one** Zakat-related function exists in the live database (`pg_proc` query confirmed): `get_zakat_summary`. No Hawl function, no Nisab-tracking table, no price-storage table.

### 1.2 Web (TypeScript)

Real logic (non-locale, non-copy):

- `app/(dashboard)/dashboard/zakat/page.tsx` — the calculator page (details in §2.2)
- `app/api/zakat/prices/route.ts` — live gold/silver price proxy (Yahoo `GC=F`/`SI=F` → FreeGoldAPI fallback; exchange rate from `open.er-api.com` with hardcoded JOD/SAR/AED/KWD/EGP fallbacks)
- `app/api/zakat-reminder/route.ts` — cron that sends push reminders at Hawl −30d/−7d/0
- `lib/push-send.ts`, `app/api/smart-notifications/route.ts` — routing/triggering only
- `lib/locales/*` — UI strings only (incl. the Sharia disclaimer)

### 1.3 Mobile (Dart)

Real logic:

- `mobile/fajrak_flutter/lib/screens/more/zakat_calculator_screen.dart` — **full local engine** (details in §2.3)
- `mobile/fajrak_flutter/lib/services/finance_service.dart:37` — `fetchZakatSummary()` RPC wrapper… **zero call sites** (verified by grep; only the definition matches)

---

## Step 2 — Discrepancy Analysis

### 2.1 Does the web app calculate Zakat locally or call the RPC?

**Hybrid — and the two disagree by design.** The web page calls `get_zakat_summary` (lines 77–83, 92–97) but then **discards** the RPC's `zakat_due` and `is_eligible` fields and recomputes them in TypeScript (`page.tsx:104–108`):

```ts
const nisab = zakatSummary?.nisab_effective ?? 0
const totalZakatable = (zakatSummary?.zakatable_assets ?? 0) + (goldGram * goldPrice) + (silverGram * silverPrice)
const zakatDue = totalZakatable >= nisab ? totalZakatable * 0.025 : 0
const eligible = totalZakatable >= nisab
```

The RPC is effectively reduced to a Nisab oracle plus a base-asset number.

### 2.2 Does the mobile app calculate Zakat locally or call the RPC?

**100% local, in Dart** (`zakat_calculator_screen.dart:169–183`). The RPC is never invoked from the screen:

```dart
double get _nisabGold => 85 * _goldPrice;
double get _nisabSilver => 595 * _silverPrice;
double get _nisab => _nisabGold < _nisabSilver ? _nisabGold : _nisabSilver;
double get _totalAssets => _goldGram * _goldPrice + _silverGram * _silverPrice + _cash + _investments;
double get _totalZakatable => (_totalAssets - _debts).clamp(0, double.infinity);
double get _zakatDue => _totalZakatable >= _nisab ? _totalZakatable * 0.025 : 0;
```

It only calls `get_financial_dashboard` for the auto-fill fields (cash/investments/debts), then does all Zakat math client-side.

### 2.3 Nisab differences

| Aspect | RPC (Postgres) | Web (TS) | Mobile (Dart) |
|--------|---------------|----------|---------------|
| Gold threshold | 85 g | uses RPC value ✅ | 85 g (recomputed) |
| Silver threshold | 595 g | uses RPC value ✅ | 595 g (recomputed) |
| Effective Nisab | `least(gold, silver)` | uses RPC value ✅ | `min(gold, silver)` (recomputed) |
| Negative clamping | **none** — `zakatable_assets` may be negative | **none** — no clamp | **clamped at 0** ⚠️ |
| Gold/silver holdings in assets | ❌ not included | ✅ added manually (`grams × price`) | ✅ added manually (`grams × price`) |

The grams constants (85/595) are correct and consistent, but triplicated. The **clamping difference is a real numeric discrepancy**: for a user whose debts exceed assets, mobile shows `0`, web/RPC show a negative zakatable base (eligibility is false in both, but the displayed "Zakatable Assets" figure differs).

### 2.4 Input sourcing consistency

| Input | Web | Mobile | Consistent? |
|-------|-----|--------|-------------|
| Gold/silver spot price | `/api/zakat/prices` (server proxy: Yahoo → FreeGoldAPI) | Client-side direct: Yahoo → FreeGoldAPI | ⚠️ Same sources, but fetched at different times and from different paths; web caches 1h server-side, mobile does not |
| USD→local FX rate | `open.er-api.com` (via `/api/zakat/prices`) **and** `lib/currency.ts` `fetchExchangeRate` (used for the dashboard call) | `CurrencyService.fetchExchangeRate` (Yahoo-based) | ❌ **Different FX providers** — web auto-fill rate and mobile rate can differ, producing different `investments_value_local` inputs to the same RPC |
| Default gold/silver price before fetch | 30 / 0.35 | 30 / 0.35 | ✅ (but hardcoded in two places) |
| Troy oz → gram | 31.1035 | 31.1035 | ✅ (duplicated constant) |
| Cash/investments/debts auto-fill | `get_financial_dashboard` RPC | `get_financial_dashboard` RPC | ✅ |
| Manual overrides | User can edit all fields | User can edit all fields | ⚠️ Mobile saves its locally-computed totals to `zakat_history`; web saves its own hybrid totals — history rows from the two apps are not comparable |

### 2.5 Hawl (354-day lunar year)

The RPC performs **no Hawl logic at all** — it is a pure point-in-time snapshot ("has the wealth exceeded Nisab today"). Hawl is implemented three separate times in application code:

1. **Web page** (`page.tsx:10–26`): `HAUL_DAYS = 354`, start = `purchase_date ?? created_at`, `Math.ceil` on remaining days.
2. **Mobile screen** (`zakat_calculator_screen.dart:33–51`): same 354 days, same `purchase_date ?? created_at` fallback, but `difference(...).inDays` — Dart truncates toward zero while web uses `Math.ceil`, a potential **off-by-one** on the due day (matters because the cron fires on `daysLeft === 0`).
3. **Cron route** (`zakat-reminder/route.ts:38–40`): 354 days from `created_at` **only — it ignores `purchase_date` entirely**. ⚠️ **Bug:** a user who backdated an investment's purchase date gets reminders based on `created_at`, while the calculator UI on both platforms shows the earlier `purchase_date`-based due date. The reminder and the UI can disagree by months.

Additionally, neither platform nor the DB tracks **when Nisab was first reached** — the canonical Islamic criterion for Hawl on new wealth. The current model (Hawl from purchase/creation date of each investment) is an approximation acknowledged in the UI disclaimer.

---

## Step 3 — Live RPC Inspection (Supabase MCP)

Fetched via `SELECT pg_get_functiondef('public.get_zakat_summary'::regproc);` — live definition matches migration `20260907083248`:

```sql
CREATE OR REPLACE FUNCTION public.get_zakat_summary(
  p_user_id uuid,
  p_gold_price_per_gram double precision,
  p_silver_price_per_gram double precision,
  p_usd_to_local_rate double precision DEFAULT 1.0
)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'auth', 'pg_temp'
AS $function$
DECLARE
  v_dash json;
  v_nisab_gold numeric;
  v_nisab_silver numeric;
  v_nisab_effective numeric;
  v_zakatable_assets numeric;
  v_zakat_due numeric;
  v_is_eligible boolean;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN RAISE EXCEPTION 'Not authorized'; END IF;
  v_dash := public.get_financial_dashboard(p_user_id, p_usd_to_local_rate);
  v_nisab_gold := 85 * p_gold_price_per_gram;
  v_nisab_silver := 595 * p_silver_price_per_gram;
  v_nisab_effective := least(v_nisab_gold, v_nisab_silver);
  v_zakatable_assets := (v_dash->>'total_accounts_balance')::numeric
                      + (v_dash->>'investments_value_local')::numeric
                      + (v_dash->>'investment_cash_local')::numeric
                      + (v_dash->>'goals_saved')::numeric
                      - (v_dash->>'total_debt_owed')::numeric;
  IF v_zakatable_assets >= v_nisab_effective THEN
    v_is_eligible := true;
    v_zakat_due := v_zakatable_assets * 0.025;
  ELSE
    v_is_eligible := false;
    v_zakat_due := 0;
  END IF;
  RETURN json_build_object(
    'is_eligible', v_is_eligible,
    'zakat_due', v_zakat_due,
    'zakatable_assets', v_zakatable_assets,
    'nisab_gold', v_nisab_gold,
    'nisab_silver', v_nisab_silver,
    'nisab_effective', v_nisab_effective
  );
END;
$function$
```

### Asset-type coverage (via `get_financial_dashboard` inputs)

| Asset type | Covered by RPC? | Source |
|------------|-----------------|--------|
| Cash / bank accounts | ✅ | `accounts.current_balance` (via `get_account_balances`) |
| Stocks / investments | ✅ | `investments.shares × current_price` (USD → local) |
| Investment cash account | ✅ | `investment_cash.balance` (USD → local) |
| Savings goals | ✅ | `savings_goals.current_amount` |
| Debts owed (liability) | ✅ deducted | `debts WHERE debt_type='owed'` |
| Gold/silver holdings (jewelry, bullion) | ❌ **missing** | Not stored in DB — clients pass grams manually, RPC ignores them |
| Real estate | ❌ **missing** | No table/asset class exists in the schema |
| Receivables owed to user | ❌ not included | Computed in dashboard (`total_receivable`) but excluded from Zakatable base — debatable fiqh, currently a silent choice |
| Physical goods / inventory (for trade) | ❌ **missing** | No table exists |

### Nisab logic correctness

The RPC's Nisab math (85 g gold, 595 g silver, `least()` of the two) is the standard, fiqh-correct "more lenient for the poor" choice and matches both clients' intent. **However the RPC has two defects:**

1. **No negative clamp** on `zakatable_assets` (mobile clamps; web and RPC don't).
2. **No Hawl awareness** — eligibility is purely snapshot-based; the 2.5% is applied to all assets regardless of whether they've been held for a lunar year.
3. **Gold/silver grams are not inputs** — the RPC's Nisab uses prices the client passes, but the user's gold/silver *holdings* never enter `zakatable_assets` server-side. Today clients patch this by adding `grams × price` after the RPC returns, meaning **the saved `zakat_history` row and the RPC's own `zakat_due` are both wrong for any user holding gold/silver**.

---

## Step 4 — Unification Plan (Proposed — NOT implemented)

**Target architecture:** the PostgreSQL RPC is the *only* place Zakat rules exist. Clients become pure input-capture + display layers. The reminder cron calls the same RPC instead of reimplementing Hawl.

### 4.1 Schema changes (new migration)

1. **`public.zakat_holdings` table** (or extend existing asset tables) — so gold/silver are first-class assets instead of ephemeral form fields:
   ```sql
   CREATE TABLE public.zakat_holdings (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
     asset_type text NOT NULL CHECK (asset_type IN ('gold','silver','real_estate','inventory','other')),
     grams numeric,                      -- for gold/silver
     value_usd numeric,                  -- for real_estate/inventory/other
     purchase_date date,
     created_at timestamptz DEFAULT now()
   );
   -- RLS: users manage own rows (same pattern as zakat_history)
   ```
2. **`zakat_history` additions** for auditability: `nisab_effective numeric`, `price_gold numeric`, `price_silver numeric`, `fx_rate numeric`, `engine_version int` — so historical records show *what inputs produced the number* (today a saved record cannot be recomputed or disputed).
3. **Hawl/Nisab-reach tracking — lightweight option:** add `nisab_first_reached_at timestamptz` to `zakat_history` (or a small `zakat_haul_state` table). The RPC updates it on each call: if assets ≥ Nisab and the field is null, stamp it; if below Nisab, clear it. Hawl = `nisab_first_reached_at + 354 days` per the classical "wealth above Nisab for a lunar year" criterion — computed for the aggregate, while per-investment purchase-date Hawl remains as a *secondary, informational* indicator.

### 4.2 RPC updates

- **Keep `get_zakat_summary(p_user_id, p_gold_price_per_gram, p_silver_price_per_gram, p_usd_to_local_rate)`** (same signature — both clients already call it or wrap it; no breaking change), but:
  - Include `zakat_holdings` (gold grams × price, silver grams × price, other values × rate) inside `v_zakatable_assets`.
  - `GREATEST(v_zakatable_assets, 0)` before the Nisab comparison and 2.5% multiplication.
  - Return an **extended payload**: per-component breakdown (`components: {cash, investments, investment_cash, goals, gold, silver, other, debts}`), `haul_due_date` / `days_to_haul` from `nisab_first_reached_at`, `engine_version`, and a `round(numeric, 2)`-normalized output so all clients display identical figures.
  - Stamp/clear `nisab_first_reached_at` (see §4.1.3) inside the same function.
- **New `get_zakat_hauls(p_user_id)` RPC** — returns per-investment haul due dates (`COALESCE(purchase_date, created_at) + 354 days`) as one JSON array. This replaces all three client-side Hawl implementations, and fixes the cron's `purchase_date` bug by making the cron call this RPC.
- Bump `engine_version` constant in the SQL for traceability.

### 4.3 Refactoring Web

| File | Action |
|------|--------|
| `app/(dashboard)/dashboard/zakat/page.tsx` | Delete local math at lines 104–108 → render `zakat.zakat_due`, `zakat.is_eligible`, `zakat.zakatable_assets` verbatim. Delete `HAUL_DAYS`/`haulStart`/`haulDaysLeft`/`haulDueDate` (lines 10–26) → consume `get_zakat_hauls`. Gold/silver grams become inputs sent *into* the RPC call (or edited via `zakat_holdings`), not post-processing. Keep `handleSave` but persist RPC-returned numbers. |
| `app/api/zakat-reminder/route.ts` | Replace inline Hawl loop with a call to `get_zakat_hauls` (fixes the ignored-`purchase_date` bug). Per-investment 2.5% figure in the push body comes from the RPC payload, not `invValue * 0.025` in TS. |
| `app/api/zakat/prices/route.ts` | Keep as the single price/FX proxy, but also have mobile call it (or move price fetch into a `get_zakat_summary` variant) — see §4.4. |

### 4.4 Refactoring Mobile

| File | Action |
|------|--------|
| `screens/more/zakat_calculator_screen.dart` | **Delete local getters `_nisabGold`, `_nisabSilver`, `_nisab`, `_totalZakatable`, `_zakatDue`, `_eligible` (lines 177–183)** and `_haulDays`/`_haulStart`/`_daysLeft`/`_haulDueDate` (lines 33–51). Replace with `FinanceService.fetchZakatSummary(...)` — **the wrapper already exists and matches the RPC signature exactly**; it just needs to be called. Display RPC fields verbatim; haul list from a new `FinanceService.fetchZakatHauls()`. |
| `services/finance_service.dart` | Add `fetchZakatHauls()` next to the existing (already-correct) `fetchZakatSummary()`. |
| Price fetching | Route mobile's live-price fetch through the same logic as `/api/zakat/prices` (ideally call the Next.js API endpoint, or replicate its FX source) so web and mobile never compute Nisab from different gold/FX snapshots at the same moment. |

### 4.5 Testing strategy — proving Web == Mobile on 1000 scenarios

1. **Golden fixture table in Postgres** — `zakat_test_cases(inputs JSONB, expected JSONB)`, seeded via a migration with ~1,000 generated scenarios covering: below/at/above Nisab boundaries (±0.01), negative nets (clamp check), gold-dominant vs silver-dominant Nisab, 0 prices, missing dashboard components, extreme FX rates, holdings present/absent, and Hawl edge cases (day 353/354/355).
2. **pgTAP / SQL assertion job** — run `get_zakat_summary` against every fixture and diff against `expected`. This is the canonical oracle: it runs in CI against a shadow database and gates every future RPC migration.
3. **Cross-client contract tests** — since clients will *only* render RPC output after unification, the "same result" proof reduces to two much cheaper properties:
   - *Web:* a Vitest suite that mocks the RPC response fixtures and asserts the page renders `zakat_due`/`total` **byte-identical** to the fixture (no local arithmetic survives in the component — enforce with a lint/grep gate in CI: `page.tsx` must not contain `0.025` or `354`).
   - *Mobile:* a `flutter test` mirror of the same fixtures asserting the screen renders RPC values verbatim (grep gate: no `0.025`, `85 *`, `595 *`, `354` in `zakat_calculator_screen.dart`).
4. **Differential smoke test (staging)** — a nightly script seeds one staging user with randomized data, calls the RPC directly, then drives both UIs (Playwright for web, `flutter drive` for mobile) and screenshots/extracts the displayed totals, asserting equality. Run on the 1,000 fixtures as a batch job producing a pass/fail matrix.
5. **Regression history** — store `engine_version` in `zakat_history` so any future engine change is auditable against old records.

### Suggested implementation order

1. Migration: `zakat_holdings` + `zakat_history` columns + fixture table (§4.1, §4.5.1)
2. RPC v2: holdings inclusion, clamp, extended payload, haul tracking, `get_zakat_hauls` (§4.2) + pgTAP suite
3. Web refactor (§4.3) — smaller diff, faster validation
4. Mobile refactor (§4.4) — activate existing `fetchZakatSummary`
5. Cron fix + cross-client differential tests (§4.5)

---

## Risk Notes

- **Saved `zakat_history` rows are already inconsistent** between platforms (web-saved vs mobile-saved totals use different formulas). Migration step 1 should backfill nothing — but the UI should stop implying old rows are comparable to new-engine rows.
- The RPC's `SECURITY DEFINER` + `auth.uid()` guard is correct and should be preserved in v2; note `get_financial_dashboard` (called internally) allows service-role or null-uid callers — v2 should keep the explicit uid check at the entry RPC.
- Any change to `get_zakat_summary`'s return shape must land **before** client refactors, and both clients should tolerate unknown JSON keys during the rollout window.

*End of report. No code was modified; nothing was committed or pushed.*
