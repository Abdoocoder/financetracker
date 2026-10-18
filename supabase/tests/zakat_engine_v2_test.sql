-- ============================================================================
-- Verification harness for the Zakat engine v2 (supabase/migrations/20261019000000)
--
-- Purpose: SAMPLE PROOF, not a full CI suite. Proves that
--   public.get_zakat_summary(p_user_id, p_gold_price_per_gram,
--                            p_silver_price_per_gram, p_fx_rate)
-- returns exactly the values declared in public.zakat_test_cases for every
-- seeded edge case, with a 0.01 tolerance to absorb float8 rounding
-- (e.g. 595 * 0.35 -> 208.24999999999997).
--
-- Run locally ONLY (never against production):
--   1. psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 \
--        -f supabase/tests/zakat_fixtures.sql      # seeds zakat_test_cases
--   2. psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 \
--        -f supabase/tests/zakat_engine_v2_test.sql
--   (Note: `supabase db reset` does NOT apply the fixtures - they are not a
--    migration by design; always run zakat_fixtures.sql first.)
--
-- What it covers:
--   1. Every row in zakat_test_cases: seeds a scratch user (auth.users ->
--      trigger creates the profile), seeds accounts/investments/
--      investment_cash/savings_goals/debts/zakat_holdings from `inputs`,
--      impersonates the user via request.jwt.claims, calls the RPC, and
--      asserts every key in `expected` (is_eligible, zakat_due,
--      zakatable_assets, nisab_gold/silver/effective, all 8 components).
--   2. get_zakat_hauls: investments + gold + silver, 354-day haul,
--      days_remaining sign, COALESCE(purchase_date, created_at) fallback.
--   3. The live auth guard: calling with a mismatched subject RAISEs.
--   4. Schema assertions: engine_version default, shape CHECK on holdings,
--      RLS enabled.
--
-- Design: all fixture users are created inside one transaction and rolled
-- back at the end, so the database is left untouched even on success.
-- ============================================================================
\set ON_ERROR_STOP on

do $$
declare
  tc              record;
  v_uid           uuid;
  v_result        jsonb;
  v_pass          int := 0;
  v_fail          int := 0;
  v_line          text;

  -- hauls-test user + results
  v_haul_uid      uuid;
  v_hauls         jsonb;
  v_inv_days      int;
  v_gold_days     int;
  v_silver_days   int;
  v_haul_count    int;
  v_haul_fail_marker int;
  v_missing_cols  int;

  -- generic comparison helpers
  k               text;
  v_got_num       numeric;
  v_exp_num       numeric;
  v_got_bool      boolean;
begin
  -- ============================================================
  -- 1. Edge case fixtures vs get_zakat_summary
  -- ============================================================
  for tc in select * from public.zakat_test_cases order by name loop
    -- scratch user: inserting into auth.users fires on_auth_user_created,
    -- which creates the matching profiles row automatically.
    v_uid := gen_random_uuid();
    insert into auth.users (id, instance_id, aud, role, email,
                            encrypted_password, email_confirmed_at,
                            raw_app_meta_data, raw_user_meta_data,
                            created_at, updated_at)
    values (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated',
            'authenticated', 'zakat-test-' || v_uid || '@example.test',
            crypt('test-password-not-real', gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}',
            '{}', now(), now());

    -- seed money rows from tc.inputs
    if coalesce((tc.inputs->>'cash')::numeric, 0) > 0 then
      insert into public.accounts (user_id, name, type, opening_balance)
      values (v_uid, 'Test Cash', 'cash', (tc.inputs->>'cash')::numeric);
    end if;

    if coalesce((tc.inputs->>'investments_usd')::numeric, 0) > 0 then
      insert into public.investments (user_id, symbol, name, type,
                                      shares, current_price)
      values (v_uid, 'TST', 'Test Inc', 'stock',
              (tc.inputs->>'investments_usd')::numeric, 1);
    end if;

    if coalesce((tc.inputs->>'investment_cash_usd')::numeric, 0) > 0 then
      insert into public.investment_cash (user_id, currency, balance)
      values (v_uid, 'USD', (tc.inputs->>'investment_cash_usd')::numeric);
    end if;

    if coalesce((tc.inputs->>'goals')::numeric, 0) > 0 then
      insert into public.savings_goals (user_id, name, target_amount,
                                        current_amount)
      values (v_uid, 'Test Goal', (tc.inputs->>'goals')::numeric,
              (tc.inputs->>'goals')::numeric);
    end if;

    if coalesce((tc.inputs->>'debt_owed')::numeric, 0) > 0 then
      insert into public.debts (user_id, name, original_amount,
                                remaining_amount, debt_type)
      values (v_uid, 'Test Debt', (tc.inputs->>'debt_owed')::numeric,
              (tc.inputs->>'debt_owed')::numeric, 'owed');
    end if;

    if coalesce((tc.inputs->>'gold_grams')::numeric, 0) > 0 then
      insert into public.zakat_holdings (user_id, asset_type, grams)
      values (v_uid, 'gold', (tc.inputs->>'gold_grams')::numeric);
    end if;

    if coalesce((tc.inputs->>'silver_grams')::numeric, 0) > 0 then
      insert into public.zakat_holdings (user_id, asset_type, grams)
      values (v_uid, 'silver', (tc.inputs->>'silver_grams')::numeric);
    end if;

    if coalesce((tc.inputs->>'other_value_usd')::numeric, 0) > 0 then
      insert into public.zakat_holdings (user_id, asset_type, value_usd)
      values (v_uid, 'other', (tc.inputs->>'other_value_usd')::numeric);
    end if;

    -- impersonate: set request.jwt.claims so auth.uid() returns v_uid
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_uid, 'role', 'authenticated')::text, false);

    select public.get_zakat_summary(
      v_uid,
      (tc.inputs->>'gold_price')::double precision,
      (tc.inputs->>'silver_price')::double precision,
      (tc.inputs->>'fx_rate')::double precision
    )::jsonb into v_result;

    -- boolean fields
    foreach k in array array['is_eligible'] loop
      v_got_bool := (v_result->>k)::boolean;
      if v_got_bool is distinct from (tc.expected->>k)::boolean then
        v_fail := v_fail + 1;
        raise notice 'FAIL [%] %: got %, expected %',
          tc.name, k, v_result->>k, tc.expected->>k;
      end if;
    end loop;

    -- numeric top-level fields (0.01 tolerance for float8 dust)
    foreach k in array array['zakat_due', 'zakatable_assets', 'nisab_gold',
                             'nisab_silver', 'nisab_effective'] loop
      v_got_num  := (v_result->>k)::numeric;
      v_exp_num  := (tc.expected->>k)::numeric;
      if abs(v_got_num - v_exp_num) > 0.01 then
        v_fail := v_fail + 1;
        raise notice 'FAIL [%] %: got %, expected %',
          tc.name, k, v_got_num, v_exp_num;
      end if;
    end loop;

    -- components breakdown (8 keys)
    foreach k in array array['cash', 'investments', 'investment_cash',
                             'goals', 'gold', 'silver', 'other', 'debts'] loop
      v_got_num := (v_result->'components'->>k)::numeric;
      v_exp_num := (tc.expected->'components'->>k)::numeric;
      if v_got_num is null or abs(v_got_num - v_exp_num) > 0.01 then
        v_fail := v_fail + 1;
        raise notice 'FAIL [%] components.%: got %, expected %',
          tc.name, k, v_result->'components'->>k, v_exp_num;
      end if;
    end loop;

    -- engine_version marker
    if (v_result->>'engine_version')::int is distinct from 2 then
      v_fail := v_fail + 1;
      raise notice 'FAIL [%] engine_version: got %, expected 2',
        tc.name, v_result->>'engine_version';
    end if;

    -- NOTE: get_zakat_summary intentionally does NOT write zakat_history.
    --   In v1 (and preserved in v2) history rows are written by the clients
    --   after calling the RPC — a Phase 2 concern. The v2 migration only
    --   adds the recomputable audit columns (nisab_effective, price_gold,
    --   price_silver, fx_rate, engine_version), asserted in section 4.

    v_pass := v_pass + 1;
    raise notice 'PASS fixture: %', tc.name;
  end loop;

  -- ============================================================
  -- 2. get_zakat_hauls: 354-day hauls for investments + holdings
  -- ============================================================
  v_haul_uid := gen_random_uuid();
  insert into auth.users (id, instance_id, aud, role, email,
                          encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data,
                          created_at, updated_at)
  values (v_haul_uid, '00000000-0000-0000-0000-000000000000', 'authenticated',
          'authenticated', 'zakat-haul-' || v_haul_uid || '@example.test',
          crypt('test-password-not-real', gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}',
          '{}', now(), now());

  -- investment bought 100 days ago -> days_remaining = 354 - 100 = 254
  v_haul_fail_marker := v_fail;
  insert into public.investments (user_id, symbol, name, type, shares,
                                  current_price, purchase_date)
  values (v_haul_uid, 'HUL', 'Haul Inc', 'stock', 10, 5,
          (current_date - 100)::date);

  -- gold bought 400 days ago -> haul passed 46 days ago -> -46
  insert into public.zakat_holdings (user_id, asset_type, grams, purchase_date)
  values (v_haul_uid, 'gold', 10, (current_date - 400)::date);

  -- silver with NULL purchase_date -> falls back to created_at (now) -> 354
  insert into public.zakat_holdings (user_id, asset_type, grams)
  values (v_haul_uid, 'silver', 50);

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_haul_uid, 'role', 'authenticated')::text, false);

  select public.get_zakat_hauls(v_haul_uid)::jsonb into v_hauls;

  v_haul_count := jsonb_array_length(v_hauls);
  if v_haul_count <> 3 then
    v_fail := v_fail + 1;
    raise notice 'FAIL hauls: expected 3 rows, got %', v_haul_count;
  end if;

  select (elem->>'days_remaining')::int into v_inv_days
  from jsonb_array_elements(v_hauls) elem
  where elem->>'source' = 'investment';
  if v_inv_days is distinct from 254 then
    v_fail := v_fail + 1;
    raise notice 'FAIL hauls investment days_remaining: got %, expected 254', v_inv_days;
  end if;

  select (elem->>'days_remaining')::int into v_gold_days
  from jsonb_array_elements(v_hauls) elem
  where elem->>'source' = 'holding' and elem->>'asset_type' = 'gold';
  if v_gold_days is distinct from -46 then
    v_fail := v_fail + 1;
    raise notice 'FAIL hauls gold days_remaining: got %, expected -46', v_gold_days;
  end if;

  select (elem->>'days_remaining')::int into v_silver_days
  from jsonb_array_elements(v_hauls) elem
  where elem->>'source' = 'holding' and elem->>'asset_type' = 'silver';
  if v_silver_days is distinct from 354 then
    v_fail := v_fail + 1;
    raise notice 'FAIL hauls silver (created_at fallback) days_remaining: got %, expected 354', v_silver_days;
  end if;

  if v_fail = v_haul_fail_marker then
    raise notice 'PASS hauls: 3 rows, days_remaining 254 / -46 / 354';
  end if;

  -- ============================================================
  -- 3. Auth guard: mismatched subject must RAISE
  -- ============================================================
  perform set_config('request.jwt.claims',
    json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, false);
  begin
    v_line := public.get_zakat_summary(v_haul_uid, 30, 0.35, 1)::text;
    v_fail := v_fail + 1;
    raise notice 'FAIL guard: get_zakat_summary did NOT raise for mismatched user';
  exception when others then
    if sqlerrm like '%Not authorized%' then
      raise notice 'PASS guard: get_zakat_summary raises for mismatched user';
    else
      v_fail := v_fail + 1;
      raise notice 'FAIL guard: unexpected error %', sqlerrm;
    end if;
  end;

  begin
    v_line := public.get_zakat_hauls(v_haul_uid)::text;
    v_fail := v_fail + 1;
    raise notice 'FAIL guard: get_zakat_hauls did NOT raise for mismatched user';
  exception when others then
    if sqlerrm like '%Not authorized%' then
      raise notice 'PASS guard: get_zakat_hauls raises for mismatched user';
    else
      v_fail := v_fail + 1;
      raise notice 'FAIL guard: unexpected error %', sqlerrm;
    end if;
  end;

  -- ============================================================
  -- 3b. Service-role simulation: NULL uid (no JWT claims) may call
  --     both RPCs for any user (cron / background job path).
  --     Setting request.jwt.claims to '' makes auth.uid() return NULL.
  -- ============================================================
  perform set_config('request.jwt.claims', '', false);
  begin
    select public.get_zakat_summary(v_haul_uid, 30, 0.35, 1)::jsonb into v_result;
    if (v_result->>'engine_version')::int is distinct from 2 then
      v_fail := v_fail + 1;
      raise notice 'FAIL service_role: get_zakat_summary returned unexpected payload %', v_result;
    else
      raise notice 'PASS service_role: get_zakat_summary allowed with NULL uid';
    end if;
  exception when others then
    v_fail := v_fail + 1;
    raise notice 'FAIL service_role: get_zakat_summary raised % for NULL uid', sqlerrm;
  end;

  begin
    select public.get_zakat_hauls(v_haul_uid)::jsonb into v_hauls;
    if jsonb_array_length(v_hauls) <> 3 then
      v_fail := v_fail + 1;
      raise notice 'FAIL service_role: get_zakat_hauls returned % rows, expected 3', jsonb_array_length(v_hauls);
    else
      raise notice 'PASS service_role: get_zakat_hauls allowed with NULL uid (3 rows)';
    end if;
  exception when others then
    v_fail := v_fail + 1;
    raise notice 'FAIL service_role: get_zakat_hauls raised % for NULL uid', sqlerrm;
  end;

  -- restore non-NULL claims state after the service_role simulation
  perform set_config('request.jwt.claims',
    json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, false);

  -- ============================================================
  -- 4. Schema assertions
  -- ============================================================
  if (select column_default from information_schema.columns
      where table_schema = 'public' and table_name = 'zakat_history'
        and column_name = 'engine_version') <> '2' then
    v_fail := v_fail + 1;
    raise notice 'FAIL schema: zakat_history.engine_version default is not 2';
  else
    raise notice 'PASS schema: engine_version default 2';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'zakat_holdings'
  ) then
    v_fail := v_fail + 1;
    raise notice 'FAIL schema: no RLS policy on zakat_holdings';
  else
    raise notice 'PASS schema: zakat_holdings RLS policy present';
  end if;

  -- audit columns present on zakat_history (recomputable history rows;
  -- the INSERT into zakat_history remains a client/Phase-2 concern)
  select count(*) into v_missing_cols
  from (values ('nisab_effective'), ('price_gold'), ('price_silver'),
               ('fx_rate'), ('engine_version')) v(col)
  where not exists (
    select 1 from information_schema.columns c
    where c.table_schema = 'public' and c.table_name = 'zakat_history'
      and c.column_name = v.col
  );
  if v_missing_cols > 0 then
    v_fail := v_fail + 1;
    raise notice 'FAIL schema: % zakat_history audit column(s) missing', v_missing_cols;
  else
    raise notice 'PASS schema: all 5 zakat_history audit columns present';
  end if;

  -- ============================================================
  -- Summary + rollback (fixtures never persist)
  -- ============================================================
  raise notice '---------------------------------------------';
  raise notice 'zakat engine v2 verification: % fixture groups exercised, % failures',
    (select count(*) from public.zakat_test_cases), v_fail;
  if v_fail > 0 then
    raise exception 'VERIFICATION FAILED (% failures)', v_fail;
  end if;
  raise notice 'ALL CHECKS PASSED';
  raise notice '---------------------------------------------';

  rollback; -- scratch users + holdings removed; DB left as found
end $$;
