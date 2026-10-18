-- File: supabase/tests/zakat_fixtures.sql  (NOT a migration - run manually)
-- Purpose: Test fixture data for the Zakat engine v2 verification harness.
--   Adds the zakat_test_cases table and seeds >= 10 edge cases used by
--   supabase/tests/zakat_engine_v2_test.sql (run locally only).
--
-- HOW TO RUN (in order, against the LOCAL db):
--   1. psql "$DBURL" -v ON_ERROR_STOP=1 -f supabase/tests/zakat_fixtures.sql
--   2. psql "$DBURL" -v ON_ERROR_STOP=1 -f supabase/tests/zakat_engine_v2_test.sql
--
-- IMPORTANT: These are TEST fixtures and must NEVER live in
--   supabase/migrations/ (they would run against production on
--   `supabase db push`). The table has RLS enabled with NO policies
--   (deny-all) plus no anon/authenticated grants, so it never leaks
--   into the public API surface. It is intended for local/CI
--   verification of get_zakat_summary v2.
--
-- Default price assumptions baked into the fixtures (documented in each row):
--   gold_price_per_gram  = 30.00  (JOD)
--   silver_price_per_gram = 0.35  (JOD)
--   fx_rate (USD->JOD)   = 1.00 for most cases unless testing FX scaling
--   => Nisab gold   = 85g  * 30.00 = 2550.00
--   => Nisab silver = 595g * 0.35  =  208.25
--   => effective Nisab = LEAST(2550, 208.25) = 208.25
--
-- Each row's `inputs` jsonb mirrors what the harness seeds into
--   accounts/investments/investment_cash/savings_goals/debts/zakat_holdings,
--   and `expected` jsonb holds the exact values the v2 RPC must return
--   (tolerance 0.01 applied in the harness for float8 rounding).

begin;

-- ---------------------------------------------------------------------------
-- 1. Test case table
-- ---------------------------------------------------------------------------
create table if not exists public.zakat_test_cases (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  inputs      jsonb not null,   -- what to seed for this scenario
  expected    jsonb not null,   -- what get_zakat_summary must return
  created_at  timestamptz not null default now()
);

comment on table public.zakat_test_cases is
  'Zakat engine v2 verification fixtures. Local/CI test data only - not exposed via API.';

-- Supabase linter: RLS must be enabled on public tables. No policies are
-- defined, so this is deny-all for anon/authenticated; the table is only
-- reachable by direct SQL (local/CI) or service_role.
alter table public.zakat_test_cases enable row level security;

-- Lock it down: no public/anon access.
revoke all on public.zakat_test_cases from public, anon, authenticated;
grant  all on public.zakat_test_cases to service_role;

-- ---------------------------------------------------------------------------
-- 2. Edge case fixtures (>= 10, all expected values hand-computed against
--    the v2 formulas; the harness applies a 0.01 tolerance for float8 dust)
-- ---------------------------------------------------------------------------
insert into public.zakat_test_cases (name, description, inputs, expected) values

-- C1: exactly AT Nisab -> eligible (boundary is >=), 2.5% due.
(
  'exactly_at_nisab',
  'Cash equals the effective Nisab (208.25) exactly; boundary must be eligible.',
  '{
     "cash": 208.25, "investments_usd": 0, "investment_cash_usd": 0, "goals": 0,
     "debt_owed": 0, "gold_grams": 0, "silver_grams": 0, "other_value_usd": 0,
     "gold_price": 30, "silver_price": 0.35, "fx_rate": 1
   }',
  '{
     "is_eligible": true,
     "zakat_due": 5.20625,
     "zakatable_assets": 208.25,
     "nisab_gold": 2550,
     "nisab_silver": 208.25,
     "nisab_effective": 208.25,
     "components": {
       "cash": 208.25, "investments": 0, "investment_cash": 0, "goals": 0,
       "gold": 0, "silver": 0, "other": 0, "debts": 0
     }
   }'
),

-- C2: one cent BELOW Nisab -> not eligible, due = 0 (boundary is not <).
(
  'nisab_boundary_1_cent_below',
  'Cash is 0.01 below effective Nisab (208.24); must NOT be eligible.',
  '{
     "cash": 208.24, "investments_usd": 0, "investment_cash_usd": 0, "goals": 0,
     "debt_owed": 0, "gold_grams": 0, "silver_grams": 0, "other_value_usd": 0,
     "gold_price": 30, "silver_price": 0.35, "fx_rate": 1
   }',
  '{
     "is_eligible": false,
     "zakat_due": 0,
     "zakatable_assets": 208.24,
     "nisab_gold": 2550,
     "nisab_silver": 208.25,
     "nisab_effective": 208.25,
     "components": {
       "cash": 208.24, "investments": 0, "investment_cash": 0, "goals": 0,
       "gold": 0, "silver": 0, "other": 0, "debts": 0
     }
   }'
),

-- C3: negative net -> GREATEST(raw, 0) clamp; not eligible.
(
  'negative_net_clamp',
  'Debts (500) exceed cash (100); raw net is -400 and must clamp to 0.',
  '{
     "cash": 100, "investments_usd": 0, "investment_cash_usd": 0, "goals": 0,
     "debt_owed": 500, "gold_grams": 0, "silver_grams": 0, "other_value_usd": 0,
     "gold_price": 30, "silver_price": 0.35, "fx_rate": 1
   }',
  '{
     "is_eligible": false,
     "zakat_due": 0,
     "zakatable_assets": 0,
     "nisab_gold": 2550,
     "nisab_silver": 208.25,
     "nisab_effective": 208.25,
     "components": {
       "cash": 100, "investments": 0, "investment_cash": 0, "goals": 0,
       "gold": 0, "silver": 0, "other": 0, "debts": 500
     }
   }'
),

-- C4: gold-heavy -> silver Nisab wins (208.25 < 2550), 100g gold = 3000.
(
  'gold_heavy_uses_silver_nisab',
  '100g gold (3000 JOD); silver Nisab (208.25) is the effective (lower) one.',
  '{
     "cash": 0, "investments_usd": 0, "investment_cash_usd": 0, "goals": 0,
     "debt_owed": 0, "gold_grams": 100, "silver_grams": 0, "other_value_usd": 0,
     "gold_price": 30, "silver_price": 0.35, "fx_rate": 1
   }',
  '{
     "is_eligible": true,
     "zakat_due": 75,
     "zakatable_assets": 3000,
     "nisab_gold": 2550,
     "nisab_silver": 208.25,
     "nisab_effective": 208.25,
     "components": {
       "cash": 0, "investments": 0, "investment_cash": 0, "goals": 0,
       "gold": 3000, "silver": 0, "other": 0, "debts": 0
     }
   }'
),

-- C5: silver-heavy with silver price raised so gold Nisab wins instead.
--     silver_price = 10 -> nisab_silver = 5950 > 2550 -> effective = 2550.
--     cash = 2600 >= 2550 -> eligible, due = 2600 * 0.025 = 65.
(
  'silver_nisab_uses_gold_when_gold_lower',
  'Silver price 10 makes gold Nisab (2550) the effective one; cash 2600 > 2550.',
  '{
     "cash": 2600, "investments_usd": 0, "investment_cash_usd": 0, "goals": 0,
     "debt_owed": 0, "gold_grams": 0, "silver_grams": 0, "other_value_usd": 0,
     "gold_price": 30, "silver_price": 10, "fx_rate": 1
   }',
  '{
     "is_eligible": true,
     "zakat_due": 65,
     "zakatable_assets": 2600,
     "nisab_gold": 2550,
     "nisab_silver": 5950,
     "nisab_effective": 2550,
     "components": {
       "cash": 2600, "investments": 0, "investment_cash": 0, "goals": 0,
       "gold": 0, "silver": 0, "other": 0, "debts": 0
     }
   }'
),

-- C6: zero prices -> both Nisabs are 0 -> effective 0 -> any positive
--     balance is "eligible". Degenerate input; asserted as-is by design.
(
  'zero_prices_degenerate',
  'Both metal prices 0 => Nisab 0; 500 cash is eligible and due 12.5. Degenerate but pinned behavior.',
  '{
     "cash": 500, "investments_usd": 0, "investment_cash_usd": 0, "goals": 0,
     "debt_owed": 0, "gold_grams": 0, "silver_grams": 0, "other_value_usd": 0,
     "gold_price": 0, "silver_price": 0, "fx_rate": 1
   }',
  '{
     "is_eligible": true,
     "zakat_due": 12.5,
     "zakatable_assets": 500,
     "nisab_gold": 0,
     "nisab_silver": 0,
     "nisab_effective": 0,
     "components": {
       "cash": 500, "investments": 0, "investment_cash": 0, "goals": 0,
       "gold": 0, "silver": 0, "other": 0, "debts": 0
     }
   }'
),

-- C7: all source components seeded at once.
--     cash 1000 + inv 500 + invcash 200 + goals 300 + gold 50g (1500)
--     + silver 100g (35) + other 1000 - debt 200 = 4335.
(
  'holdings_all_sources_included',
  'Every source type seeded: cash+investments+inv_cash+goals+gold+silver+other-debt = 4335.',
  '{
     "cash": 1000, "investments_usd": 500, "investment_cash_usd": 200, "goals": 300,
     "debt_owed": 200, "gold_grams": 50, "silver_grams": 100, "other_value_usd": 1000,
     "gold_price": 30, "silver_price": 0.35, "fx_rate": 1
   }',
  '{
     "is_eligible": true,
     "zakat_due": 108.375,
     "zakatable_assets": 4335,
     "nisab_gold": 2550,
     "nisab_silver": 208.25,
     "nisab_effective": 208.25,
     "components": {
       "cash": 1000, "investments": 500, "investment_cash": 200, "goals": 300,
       "gold": 1500, "silver": 35, "other": 1000, "debts": 200
     }
   }'
),

-- C8: high FX rate scales USD balances and gold value; silver grams are
--     local so they do NOT scale. inv 100 USD * 3.75 = 375;
--     gold 20g * 30 = 600; cash 50; debt 25 => 1000.
--     Nisab stays metal-price based: 208.25.
(
  'high_fx_rate_scales_usd_only',
  'fx_rate 3.75 scales investments_usd (375); gold grams priced locally are unscaled; net 1000.',
  '{
     "cash": 50, "investments_usd": 100, "investment_cash_usd": 0, "goals": 0,
     "debt_owed": 25, "gold_grams": 20, "silver_grams": 0, "other_value_usd": 0,
     "gold_price": 30, "silver_price": 0.35, "fx_rate": 3.75
   }',
  '{
     "is_eligible": true,
     "zakat_due": 25,
     "zakatable_assets": 1000,
     "nisab_gold": 2550,
     "nisab_silver": 208.25,
     "nisab_effective": 208.25,
     "components": {
       "cash": 50, "investments": 375, "investment_cash": 0, "goals": 0,
       "gold": 600, "silver": 0, "other": 0, "debts": 25
     }
   }'
),

-- C9: gold grams zero + silver grams zero but "other" real-estate holding
--     present. other 3000 - debt 50 = 2950.
(
  'other_real_estate_only',
  'Only a real-estate (other) holding of 3000 with a 50 debt; net 2950 eligible.',
  '{
     "cash": 0, "investments_usd": 0, "investment_cash_usd": 0, "goals": 0,
     "debt_owed": 50, "gold_grams": 0, "silver_grams": 0, "other_value_usd": 3000,
     "gold_price": 30, "silver_price": 0.35, "fx_rate": 1
   }',
  '{
     "is_eligible": true,
     "zakat_due": 73.75,
     "zakatable_assets": 2950,
     "nisab_gold": 2550,
     "nisab_silver": 208.25,
     "nisab_effective": 208.25,
     "components": {
       "cash": 0, "investments": 0, "investment_cash": 0, "goals": 0,
       "gold": 0, "silver": 0, "other": 3000, "debts": 50
     }
   }'
),

-- C10: all-zero user -> 0 assets, Nisab 208.25 -> not eligible, due 0.
(
  'all_zero',
  'Fresh user with no money rows; not eligible, due 0.',
  '{
     "cash": 0, "investments_usd": 0, "investment_cash_usd": 0, "goals": 0,
     "debt_owed": 0, "gold_grams": 0, "silver_grams": 0, "other_value_usd": 0,
     "gold_price": 30, "silver_price": 0.35, "fx_rate": 1
   }',
  '{
     "is_eligible": false,
     "zakat_due": 0,
     "zakatable_assets": 0,
     "nisab_gold": 2550,
     "nisab_silver": 208.25,
     "nisab_effective": 208.25,
     "components": {
       "cash": 0, "investments": 0, "investment_cash": 0, "goals": 0,
       "gold": 0, "silver": 0, "other": 0, "debts": 0
     }
   }'
),

-- C11: clamp boundary with holdings: gold 0.5g (15) + cash 50 vs debt 100
--     -> raw -35 -> clamp 0.
(
  'clamp_after_holdings',
  'Small holdings still lose to large debt; raw -35 clamps to 0 and is not eligible.',
  '{
     "cash": 50, "investments_usd": 0, "investment_cash_usd": 0, "goals": 0,
     "debt_owed": 100, "gold_grams": 0.5, "silver_grams": 0, "other_value_usd": 0,
     "gold_price": 30, "silver_price": 0.35, "fx_rate": 1
   }',
  '{
     "is_eligible": false,
     "zakat_due": 0,
     "zakatable_assets": 0,
     "nisab_gold": 2550,
     "nisab_silver": 208.25,
     "nisab_effective": 208.25,
     "components": {
       "cash": 50, "investments": 0, "investment_cash": 0, "goals": 0,
       "gold": 15, "silver": 0, "other": 0, "debts": 100
     }
   }'
),

-- C12: gold grams priced at a high gold price (112.5 JOD/g, ~3.75x) so
--     gold Nisab 85*112.5 = 9562.5 becomes the effective one.
--     gold 100g = 11250 > 9562.5 -> eligible, due = 11250*0.025 = 281.25.
(
  'gold_price_spike_shifts_nisab',
  'Gold price 112.5 raises gold Nisab to 9562.5, but effective Nisab stays the lower silver 208.25; 100g gold = 11250 eligible.',
  '{
     "cash": 0, "investments_usd": 0, "investment_cash_usd": 0, "goals": 0,
     "debt_owed": 0, "gold_grams": 100, "silver_grams": 0, "other_value_usd": 0,
     "gold_price": 112.5, "silver_price": 0.35, "fx_rate": 1
   }',
  '{
     "is_eligible": true,
     "zakat_due": 281.25,
     "zakatable_assets": 11250,
     "nisab_gold": 9562.5,
     "nisab_silver": 208.25,
     "nisab_effective": 208.25,
     "components": {
       "cash": 0, "investments": 0, "investment_cash": 0, "goals": 0,
       "gold": 11250, "silver": 0, "other": 0, "debts": 0
     }
   }'
),

-- C13: fractional grams + mixed sources near boundary.
--     cash 150.25 + gold 1g (30) + silver 10g (3.5) = 183.75 < 208.25 -> not eligible.
(
  'mixed_small_holdings_below_nisab',
  'cash 150.25 + 1g gold + 10g silver = 183.75 < 208.25 -> not eligible.',
  '{
     "cash": 150.25, "investments_usd": 0, "investment_cash_usd": 0, "goals": 0,
     "debt_owed": 0, "gold_grams": 1, "silver_grams": 10, "other_value_usd": 0,
     "gold_price": 30, "silver_price": 0.35, "fx_rate": 1
   }',
  '{
     "is_eligible": false,
     "zakat_due": 0,
     "zakatable_assets": 183.75,
     "nisab_gold": 2550,
     "nisab_silver": 208.25,
     "nisab_effective": 208.25,
     "components": {
       "cash": 150.25, "investments": 0, "investment_cash": 0, "goals": 0,
       "gold": 30, "silver": 3.5, "other": 0, "debts": 0
     }
   }'
)
on conflict (name) do update
  set description = excluded.description,
      inputs      = excluded.inputs,
      expected    = excluded.expected;

commit;
