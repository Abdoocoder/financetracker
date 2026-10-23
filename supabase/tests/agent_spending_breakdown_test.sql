-- ============================================================================
-- Verification harness for public.get_spending_breakdown
--   (supabase/migrations/20261024000000_agent_tools.sql)
--
-- Purpose: SAMPLE PROOF, not a full CI suite. Proves that the agent-facing
-- breakdown RPC:
--   1. sums only expenses for the requested month in the base currency
--   2. ignores soft-deleted rows, income rows, and other months
--   3. joins the month's budgets (limit / remaining / pct used)
--   4. keeps budgeted categories with zero spend
--   5. returns an empty result for a month with no activity
--   6. enforces the owner guard (mismatched auth.uid() raises)
--   7. allows the NULL-uid service_role path (crons)
--   8. rejects out-of-range month/year
--   9. revokes EXECUTE from PUBLIC/anon and grants authenticated+service_role
--
-- Run locally ONLY (never against production):
--   1. apply the migration (supabase db reset on a local DB)
--   2. psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 \
--        -f supabase/tests/agent_spending_breakdown_test.sql
--
-- Design: the scratch user and all rows are created inside one transaction
-- and rolled back at the end, so the database is left untouched on success.
-- ============================================================================
\set ON_ERROR_STOP on

-- Everything runs inside one transaction that is rolled back at the end, so
-- the fixtures never persist. (Transaction control is not legal inside a DO
-- block, hence the wrapper here.)
begin;

do $$
declare
  v_uid          uuid := gen_random_uuid();
  v_other_uid    uuid := gen_random_uuid();
  v_res          jsonb;
  v_cat          jsonb;
  v_fail         integer := 0;
  v_guard_raised boolean := false;
  v_month_raised boolean := false;
begin
  -- ── fixture user ────────────────────────────────────────────────────────
  -- Inserting into auth.users fires on_auth_user_created, which creates the
  -- matching profiles row automatically.
  insert into auth.users (id, instance_id, aud, role, email,
                          encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data,
                          created_at, updated_at)
  values (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated',
          'authenticated', 'agent-breakdown-' || v_uid || '@example.test',
          crypt('test-password-not-real', gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}', '{}', now(), now());

  update public.profiles set currency = 'JOD' where id = v_uid;

  -- ── fixtures: October 2026 ──────────────────────────────────────────────
  insert into public.budgets (user_id, category, monthly_limit, month, year)
  values (v_uid, 'طعام وشراب', 200, 10, 2026),
         (v_uid, 'إيجار / قسط', 500, 10, 2026);

  insert into public.transactions (user_id, type, category, amount, transaction_date, deleted_at)
  values
    (v_uid, 'expense', 'طعام وشراب', 100, date '2026-10-02', null),
    (v_uid, 'expense', 'طعام وشراب',  50, date '2026-10-15', null),
    -- soft-deleted: must not count
    (v_uid, 'expense', 'طعام وشراب', 999, date '2026-10-16', now()),
    -- spend without a budget row
    (v_uid, 'expense', 'مواصلات',     30, date '2026-10-03', null),
    -- income: must not count
    (v_uid, 'income',  'راتب',       900, date '2026-10-01', null),
    -- previous month: must not count
    (v_uid, 'expense', 'طعام وشراب',  77, date '2026-09-30', null);

  -- ── impersonate the owner ───────────────────────────────────────────────
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_uid, 'role', 'authenticated')::text, false);

  v_res := public.get_spending_breakdown(v_uid, 2026, 10)::jsonb;

  -- 1) totals
  if (v_res->>'total_expense')::numeric is distinct from 180 then
    v_fail := v_fail + 1;
    raise notice 'FAIL total_expense: got %, expected 180', v_res->>'total_expense';
  end if;
  if (v_res->>'total_budget')::numeric is distinct from 700 then
    v_fail := v_fail + 1;
    raise notice 'FAIL total_budget: got %, expected 700', v_res->>'total_budget';
  end if;
  if (v_res->>'budget_remaining')::numeric is distinct from 520 then
    v_fail := v_fail + 1;
    raise notice 'FAIL budget_remaining: got %, expected 520', v_res->>'budget_remaining';
  end if;
  if (v_res->>'category_count')::int is distinct from 3 then
    v_fail := v_fail + 1;
    raise notice 'FAIL category_count: got %, expected 3', v_res->>'category_count';
  end if;
  if v_res->>'currency' is distinct from 'JOD' then
    v_fail := v_fail + 1;
    raise notice 'FAIL currency: got %, expected JOD', v_res->>'currency';
  end if;

  -- 2) food: 150 spent against a 200 budget
  select value into v_cat
  from jsonb_array_elements(v_res->'categories')
  where value->>'category' = 'طعام وشراب';
  if v_cat is null then
    v_fail := v_fail + 1;
    raise notice 'FAIL food: category row missing';
  else
    if (v_cat->>'spent')::numeric is distinct from 150 then
      v_fail := v_fail + 1;
      raise notice 'FAIL food.spent: got %, expected 150 (soft-deleted 999 leaked?)', v_cat->>'spent';
    end if;
    if (v_cat->>'transaction_count')::int is distinct from 2 then
      v_fail := v_fail + 1;
      raise notice 'FAIL food.transaction_count: got %, expected 2', v_cat->>'transaction_count';
    end if;
    if (v_cat->>'budget_limit')::numeric is distinct from 200 then
      v_fail := v_fail + 1;
      raise notice 'FAIL food.budget_limit: got %, expected 200', v_cat->>'budget_limit';
    end if;
    if (v_cat->>'remaining')::numeric is distinct from 50 then
      v_fail := v_fail + 1;
      raise notice 'FAIL food.remaining: got %, expected 50', v_cat->>'remaining';
    end if;
    if (v_cat->>'pct_used')::numeric is distinct from 75 then
      v_fail := v_fail + 1;
      raise notice 'FAIL food.pct_used: got %, expected 75', v_cat->>'pct_used';
    end if;
  end if;

  -- 3) transport: spend with no budget
  select value into v_cat
  from jsonb_array_elements(v_res->'categories')
  where value->>'category' = 'مواصلات';
  if v_cat is null then
    v_fail := v_fail + 1;
    raise notice 'FAIL transport: category row missing';
  else
    if (v_cat->>'spent')::numeric is distinct from 30 then
      v_fail := v_fail + 1;
      raise notice 'FAIL transport.spent: got %, expected 30', v_cat->>'spent';
    end if;
    if (v_cat->>'budget_limit') is not null
       or (v_cat->>'remaining') is not null
       or (v_cat->>'pct_used') is not null then
      v_fail := v_fail + 1;
      raise notice 'FAIL transport: unbudgeted row must have null budget fields';
    end if;
  end if;

  -- 4) rent: budget with zero spend
  select value into v_cat
  from jsonb_array_elements(v_res->'categories')
  where value->>'category' = 'إيجار / قسط';
  if v_cat is null then
    v_fail := v_fail + 1;
    raise notice 'FAIL rent: budgeted category with zero spend was dropped';
  else
    if (v_cat->>'spent')::numeric is distinct from 0 then
      v_fail := v_fail + 1;
      raise notice 'FAIL rent.spent: got %, expected 0', v_cat->>'spent';
    end if;
    if (v_cat->>'remaining')::numeric is distinct from 500 then
      v_fail := v_fail + 1;
      raise notice 'FAIL rent.remaining: got %, expected 500', v_cat->>'remaining';
    end if;
    if (v_cat->>'pct_used')::numeric is distinct from 0 then
      v_fail := v_fail + 1;
      raise notice 'FAIL rent.pct_used: got %, expected 0', v_cat->>'pct_used';
    end if;
  end if;

  -- 5) empty month (no activity, no budgets)
  v_res := public.get_spending_breakdown(v_uid, 2026, 7)::jsonb;
  if (v_res->>'total_expense')::numeric is distinct from 0
     or (v_res->>'total_budget')::numeric is distinct from 0
     or (v_res->>'category_count')::int is distinct from 0
     or jsonb_array_length(v_res->'categories') <> 0 then
    v_fail := v_fail + 1;
    raise notice 'FAIL empty month: %', v_res;
  end if;

  -- 6) owner guard: a different authenticated user must be rejected
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_other_uid, 'role', 'authenticated')::text, false);
  begin
    perform public.get_spending_breakdown(v_uid, 2026, 10);
  exception when others then
    v_guard_raised := sqlerrm ilike '%Not authorized%';
  end;
  if not v_guard_raised then
    v_fail := v_fail + 1;
    raise notice 'FAIL guard: mismatched auth.uid() did not raise "Not authorized"';
  end if;

  -- 7) service_role path: NULL uid may read any user (cron parity)
  perform set_config('request.jwt.claims', '', false);
  v_res := public.get_spending_breakdown(v_uid, 2026, 10)::jsonb;
  if (v_res->>'total_expense')::numeric is distinct from 180 then
    v_fail := v_fail + 1;
    raise notice 'FAIL service_role: got %, expected 180', v_res->>'total_expense';
  end if;

  -- 8) input guards
  begin
    perform public.get_spending_breakdown(v_uid, 2026, 13);
  exception when others then
    v_month_raised := true;
  end;
  if not v_month_raised then
    v_fail := v_fail + 1;
    raise notice 'FAIL guard: month 13 did not raise';
  end if;

  -- 9) privileges
  if has_function_privilege('anon', 'public.get_spending_breakdown(uuid,int,int)', 'EXECUTE') then
    v_fail := v_fail + 1;
    raise notice 'FAIL privileges: anon can execute get_spending_breakdown';
  end if;
  if not has_function_privilege('authenticated', 'public.get_spending_breakdown(uuid,int,int)', 'EXECUTE') then
    v_fail := v_fail + 1;
    raise notice 'FAIL privileges: authenticated cannot execute get_spending_breakdown';
  end if;
  if not has_function_privilege('service_role', 'public.get_spending_breakdown(uuid,int,int)', 'EXECUTE') then
    v_fail := v_fail + 1;
    raise notice 'FAIL privileges: service_role cannot execute get_spending_breakdown';
  end if;

  -- ── summary + rollback (fixtures never persist) ─────────────────────────
  raise notice '---------------------------------------------';
  raise notice 'get_spending_breakdown verification: % failure(s)', v_fail;
  if v_fail > 0 then
    raise exception 'VERIFICATION FAILED (% failures)', v_fail;
  end if;
  raise notice 'ALL CHECKS PASSED';
  raise notice '---------------------------------------------';
end $$;

rollback; -- scratch user + rows removed; DB left as found
