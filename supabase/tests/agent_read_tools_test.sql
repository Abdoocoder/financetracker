-- ============================================================================
-- Verification harness for the Phase 1 agent read tools
--   (supabase/migrations/20261026130000_agent_read_tools.sql)
--     * public.get_debts(p_user_id uuid)
--     * public.get_budgets(p_user_id uuid, p_year int, p_month int)
--     * public.get_goals(p_user_id uuid)
--     * public.get_recent_transactions(p_user_id uuid, p_limit int)
--
-- Purpose: SAMPLE PROOF, not a full CI suite. Proves that the agent-facing
-- read RPCs:
--   1. return a JSON ARRAY (never null, even with no rows)
--   2. hide soft-deleted rows
--   3. hide paid debts
--   4. use the documented field aliases (total_amount / remaining_balance /
--      end_date / next_due_date, monthly_limit, target_amount)
--   5. compute next_due_date from payment_day with month-end clamping and
--      never return a date in the past
--   6. keep budget math in get_spending_breakdown (only budgeted categories,
--      correct limit / remaining / percentage)
--   7. exclude transfers and clamp the transaction limit to 1..100
--   8. preserve original_amount / original_currency for multi-currency users
--   9. enforce the owner guard (mismatched auth.uid() raises)
--  10. allow the NULL-uid service_role path (crons / MCP)
--  11. revoke EXECUTE from PUBLIC/anon and grant authenticated+service_role
--
-- Run locally ONLY (never against production):
--   1. apply the migration (supabase db reset on a local DB)
--   2. psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 \
--        -f supabase/tests/agent_read_tools_test.sql
--
-- Design: the scratch users and all rows are created inside one transaction
-- and rolled back at the end, so the database is left untouched on success.
-- ============================================================================
\set ON_ERROR_STOP on

begin;

do $$
declare
  v_uid            uuid := gen_random_uuid();
  v_other_uid      uuid := gen_random_uuid();
  v_res            jsonb;
  v_row            jsonb;
  v_fail           integer := 0;
  v_guard_raised   boolean;
  v_other_raised   boolean;

  -- dates used by the debt checks
  v_last_day       date;
begin
  -- ── fixture users ───────────────────────────────────────────────────────
  -- Inserting into auth.users fires on_auth_user_created, which creates the
  -- matching profiles row automatically.
  insert into auth.users (id, instance_id, aud, role, email,
                          encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data,
                          created_at, updated_at)
  values (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated',
          'authenticated', 'agent-read-' || v_uid || '@example.test',
          crypt('test-password-not-real', gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}', '{}', now(), now());

  update public.profiles set currency = 'JOD' where id = v_uid;

  -- ══════════════════════════════════════════════════════════════════════
  -- get_debts
  -- ══════════════════════════════════════════════════════════════════════
  insert into public.debts
    (user_id, name, original_amount, remaining_amount, monthly_payment,
     due_date, payment_day, debt_type, is_paid, deleted_at)
  values
    -- kept: owed, instalment on the 15th
    (v_uid, 'قرض سيارة', 1200, 800, 100, date '2027-12-31', 15, 'owed', false, null),
    -- kept: receivable with no payment_day -> next_due_date falls back to due_date
    (v_uid, 'دين لي', 300, 300, 0, current_date + 60, null, 'receivable', false, null),
    -- kept: payment_day 31 exercises month-end clamping
    (v_uid, 'بطاقة ائتمان', 500, 50, 25, null, 31, 'owed', false, null),
    -- dropped: already paid
    (v_uid, 'قرض مسدد', 900, 0, 0, current_date + 10, 5, 'owed', true, null),
    -- dropped: soft-deleted
    (v_uid, 'قرض محذوف', 700, 700, 0, current_date + 10, 5, 'owed', false, now());

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_uid, 'role', 'authenticated')::text, false);

  v_res := public.get_debts(v_uid)::jsonb;

  -- 1) array shape + row count (paid and soft-deleted dropped)
  if jsonb_typeof(v_res) is distinct from 'array' then
    v_fail := v_fail + 1;
    raise notice 'FAIL get_debts: expected a JSON array, got %', jsonb_typeof(v_res);
  elsif jsonb_array_length(v_res) <> 3 then
    v_fail := v_fail + 1;
    raise notice 'FAIL get_debts: expected 3 rows, got %', jsonb_array_length(v_res);
  end if;

  -- 2) ordering: remaining_balance desc
  if (v_res->0->>'name') is distinct from 'قرض سيارة'
     or (v_res->1->>'name') is distinct from 'دين لي'
     or (v_res->2->>'name') is distinct from 'بطاقة ائتمان' then
    v_fail := v_fail + 1;
    raise notice 'FAIL get_debts ordering: %', v_res;
  end if;

  -- 3) field aliases on the car loan
  v_row := v_res->0;
  if (v_row->>'total_amount')::numeric is distinct from 1200 then
    v_fail := v_fail + 1;
    raise notice 'FAIL get_debts.original_amount alias: got %', v_row->>'total_amount';
  end if;
  if (v_row->>'remaining_balance')::numeric is distinct from 800 then
    v_fail := v_fail + 1;
    raise notice 'FAIL get_debts.remaining_balance: got %', v_row->>'remaining_balance';
  end if;
  if (v_row->>'end_date') is distinct from '2027-12-31' then
    v_fail := v_fail + 1;
    raise notice 'FAIL get_debts.end_date: got %', v_row->>'end_date';
  end if;
  if (v_row->>'debt_type') is distinct from 'owed' then
    v_fail := v_fail + 1;
    raise notice 'FAIL get_debts.debt_type: got %', v_row->>'debt_type';
  end if;

  -- 4) next_due_date is never in the past
  if exists (
    select 1 from jsonb_array_elements(v_res) e
    where (e->>'next_due_date') is not null
      and (e->>'next_due_date')::date < current_date
  ) then
    v_fail := v_fail + 1;
    raise notice 'FAIL get_debts: a next_due_date landed in the past: %', v_res;
  end if;

  -- 5) receivable with no payment_day: next_due_date = due_date
  v_row := v_res->1;
  if (v_row->>'next_due_date')::date is distinct from (current_date + 60) then
    v_fail := v_fail + 1;
    raise notice 'FAIL get_debts fallback: next_due_date % != due_date %',
      v_row->>'next_due_date', current_date + 60;
  end if;

  -- 6) month-end clamping: day(31) must collapse to the month's last day
  v_row := v_res->2;
  v_last_day := (
    date_trunc('month', (v_row->>'next_due_date')::date)
    + interval '1 month' - interval '1 day'
  )::date;
  if extract(day from (v_row->>'next_due_date')::date)::int
     <> least(31, extract(day from v_last_day)::int) then
    v_fail := v_fail + 1;
    raise notice 'FAIL get_debts clamp: next_due_date % is not clamped to month end',
      v_row->>'next_due_date';
  end if;

  -- 7) empty result is [] and not null
  insert into auth.users (id, instance_id, aud, role, email,
                          encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data,
                          created_at, updated_at)
  values (v_other_uid, '00000000-0000-0000-0000-000000000000', 'authenticated',
          'authenticated', 'agent-read-' || v_other_uid || '@example.test',
          crypt('test-password-not-real', gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}', '{}', now(), now());

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_other_uid, 'role', 'authenticated')::text, false);
  v_res := public.get_debts(v_other_uid)::jsonb;
  if v_res is null or jsonb_typeof(v_res) is distinct from 'array'
     or jsonb_array_length(v_res) <> 0 then
    v_fail := v_fail + 1;
    raise notice 'FAIL get_debts empty: expected [], got %', v_res;
  end if;

  -- 8) owner guard
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_other_uid, 'role', 'authenticated')::text, false);
  v_guard_raised := false;
  begin
    perform public.get_debts(v_uid);
  exception when others then
    v_guard_raised := sqlerrm ilike '%Not authorized%';
  end;
  if not v_guard_raised then
    v_fail := v_fail + 1;
    raise notice 'FAIL get_debts guard: mismatched auth.uid() did not raise';
  end if;

  -- 9) service_role path: NULL uid may read any user
  perform set_config('request.jwt.claims', '', false);
  v_res := public.get_debts(v_uid)::jsonb;
  if jsonb_array_length(v_res) <> 3 then
    v_fail := v_fail + 1;
    raise notice 'FAIL get_debts service_role: expected 3 rows, got %',
      jsonb_array_length(v_res);
  end if;

  -- ══════════════════════════════════════════════════════════════════════
  -- get_budgets (fixed month: October 2026)
  -- ══════════════════════════════════════════════════════════════════════
  insert into public.budgets (user_id, category, monthly_limit, month, year)
  values (v_uid, 'طعام وشراب', 200, 10, 2026),
         (v_uid, 'إيجار / قسط', 500, 10, 2026);

  insert into public.transactions (user_id, type, category, amount, transaction_date)
  values
    (v_uid, 'expense', 'طعام وشراب', 100, date '2026-10-02'),
    (v_uid, 'expense', 'طعام وشراب',  50, date '2026-10-15'),
    -- spend with no budget row: must not appear as a "budget"
    (v_uid, 'expense', 'مواصلات',     30, date '2026-10-03');

  v_res := public.get_budgets(v_uid, 2026, 10)::jsonb;

  if jsonb_typeof(v_res) is distinct from 'array' or jsonb_array_length(v_res) <> 2 then
    v_fail := v_fail + 1;
    raise notice 'FAIL get_budgets: expected 2 budgeted categories, got %', v_res;
  end if;

  select value into v_row
  from jsonb_array_elements(v_res)
  where value->>'category' = 'طعام وشراب';
  if v_row is null then
    v_fail := v_fail + 1;
    raise notice 'FAIL get_budgets: food row missing';
  else
    if (v_row->>'monthly_limit')::numeric is distinct from 200 then
      v_fail := v_fail + 1;
      raise notice 'FAIL get_budgets.monthly_limit: got %', v_row->>'monthly_limit';
    end if;
    if (v_row->>'spent')::numeric is distinct from 150 then
      v_fail := v_fail + 1;
      raise notice 'FAIL get_budgets.spent: got %', v_row->>'spent';
    end if;
    if (v_row->>'remaining')::numeric is distinct from 50 then
      v_fail := v_fail + 1;
      raise notice 'FAIL get_budgets.remaining: got %', v_row->>'remaining';
    end if;
    if (v_row->>'percentage')::numeric is distinct from 75 then
      v_fail := v_fail + 1;
      raise notice 'FAIL get_budgets.percentage: got %', v_row->>'percentage';
    end if;
  end if;

  -- budgeted category with zero spend is still a budget
  if not exists (
    select 1 from jsonb_array_elements(v_res)
    where value->>'category' = 'إيجار / قسط'
      and (value->>'spent')::numeric = 0
      and (value->>'remaining')::numeric = 500
  ) then
    v_fail := v_fail + 1;
    raise notice 'FAIL get_budgets: zero-spend budget dropped or wrong: %', v_res;
  end if;

  -- month with no budgets -> []
  v_res := public.get_budgets(v_uid, 2026, 7)::jsonb;
  if v_res is null or jsonb_array_length(v_res) <> 0 then
    v_fail := v_fail + 1;
    raise notice 'FAIL get_budgets empty month: expected [], got %', v_res;
  end if;

  -- inherited month/year validation
  v_other_raised := false;
  begin
    perform public.get_budgets(v_uid, 2026, 13);
  exception when others then
    v_other_raised := true;
  end;
  if not v_other_raised then
    v_fail := v_fail + 1;
    raise notice 'FAIL get_budgets: month 13 did not raise';
  end if;

  -- 🔒 no cross-user read
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_uid, 'role', 'authenticated')::text, false);

  -- ══════════════════════════════════════════════════════════════════════
  -- get_goals
  -- ══════════════════════════════════════════════════════════════════════
  insert into public.savings_goals
    (user_id, name, target_amount, current_amount, target_date, deleted_at)
  values
    (v_uid, 'حج', 10000, 2500, date '2028-01-01', null),
    (v_uid, 'طوارئ', 5000, 1000, null, null),
    (v_uid, 'هدف صفري', 0, 0, date '2027-01-01', null),
    (v_uid, 'هدف محذوف', 3000, 100, date '2027-01-01', now());

  v_res := public.get_goals(v_uid)::jsonb;

  if jsonb_typeof(v_res) is distinct from 'array' or jsonb_array_length(v_res) <> 3 then
    v_fail := v_fail + 1;
    raise notice 'FAIL get_goals: expected 3 goals, got %', v_res;
  end if;

  -- ordering: target_date asc, nulls last
  if (v_res->0->>'name') is distinct from 'هدف صفري'
     or (v_res->1->>'name') is distinct from 'حج'
     or (v_res->2->>'name') is distinct from 'طوارئ' then
    v_fail := v_fail + 1;
    raise notice 'FAIL get_goals ordering: %', v_res;
  end if;

  select value into v_row
  from jsonb_array_elements(v_res)
  where value->>'name' = 'حج';
  if v_row is null then
    v_fail := v_fail + 1;
    raise notice 'FAIL get_goals: حج row missing';
  else
    if (v_row->>'target_amount')::numeric is distinct from 10000 then
      v_fail := v_fail + 1;
      raise notice 'FAIL get_goals.target_amount: got %', v_row->>'target_amount';
    end if;
    if (v_row->>'current_amount')::numeric is distinct from 2500 then
      v_fail := v_fail + 1;
      raise notice 'FAIL get_goals.current_amount: got %', v_row->>'current_amount';
    end if;
    if (v_row->>'percentage')::numeric is distinct from 25 then
      v_fail := v_fail + 1;
      raise notice 'FAIL get_goals.percentage: got %', v_row->>'percentage';
    end if;
  end if;

  -- division by zero guard: target_amount = 0 -> null percentage
  select value into v_row
  from jsonb_array_elements(v_res)
  where value->>'name' = 'هدف صفري';
  if v_row is null or v_row->'percentage' <> 'null'::jsonb then
    v_fail := v_fail + 1;
    raise notice 'FAIL get_goals: zero target must yield null percentage: %', v_row;
  end if;

  -- ══════════════════════════════════════════════════════════════════════
  -- get_recent_transactions
  -- ══════════════════════════════════════════════════════════════════════
  -- The three October rows above are reused, plus newer/older/transfer rows.
  insert into public.transactions
    (user_id, type, category, amount, transaction_date, description,
     original_amount, original_currency, exchange_rate)
  values
    (v_uid, 'expense', 'مواصلات', 12, date '2026-10-20', 'تكسي', 12, 'JOD', 1),
    (v_uid, 'income',  'راتب',   900, date '2026-10-01', 'راتب أكتوبر', 1270, 'USD', 0.709);

  -- 'transfer' only exists after 019_accounts; skip when the constraint is old.
  begin
    insert into public.transactions (user_id, type, category, amount, transaction_date)
    values (v_uid, 'transfer', 'تحويل', 500, date '2026-10-19');
  exception when check_violation then
    raise notice 'NOTE get_recent_transactions: type=transfer unsupported here, skipping';
  end;

  insert into public.transactions (user_id, type, category, amount, transaction_date, deleted_at)
  values (v_uid, 'expense', 'طعام وشراب', 999, date '2026-10-21', now());

  v_res := public.get_recent_transactions(v_uid)::jsonb;

  -- default limit is 10; 5 visible rows exist (3 Oct + taxi + salary)
  if jsonb_typeof(v_res) is distinct from 'array' then
    v_fail := v_fail + 1;
    raise notice 'FAIL get_recent_transactions: expected a JSON array';
  end if;
  if jsonb_array_length(v_res) <> 5 then
    v_fail := v_fail + 1;
    raise notice 'FAIL get_recent_transactions: expected 5 rows (no transfer, no soft-delete), got %',
      jsonb_array_length(v_res);
  end if;

  -- newest first, soft-deleted newest row excluded
  if (v_res->0->>'date') is distinct from '2026-10-20'
     or (v_res->0->>'description') is distinct from 'تكسي' then
    v_fail := v_fail + 1;
    raise notice 'FAIL get_recent_transactions ordering: %', v_res->0;
  end if;

  -- no transfers leaked
  if exists (
    select 1 from jsonb_array_elements(v_res) where value->>'type' = 'transfer'
  ) then
    v_fail := v_fail + 1;
    raise notice 'FAIL get_recent_transactions: a transfer leaked into the result';
  end if;

  -- multi-currency fields preserved
  select value into v_row
  from jsonb_array_elements(v_res)
  where value->>'category' = 'راتب';
  if v_row is null then
    v_fail := v_fail + 1;
    raise notice 'FAIL get_recent_transactions: salary row missing';
  else
    if (v_row->>'amount')::numeric is distinct from 900 then
      v_fail := v_fail + 1;
      raise notice 'FAIL get_recent_transactions.amount: got %', v_row->>'amount';
    end if;
    if (v_row->>'original_amount')::numeric is distinct from 1270 then
      v_fail := v_fail + 1;
      raise notice 'FAIL get_recent_transactions.original_amount: got %',
        v_row->>'original_amount';
    end if;
    if (v_row->>'original_currency') is distinct from 'USD' then
      v_fail := v_fail + 1;
      raise notice 'FAIL get_recent_transactions.original_currency: got %',
        v_row->>'original_currency';
    end if;
  end if;

  -- limit is honoured
  v_res := public.get_recent_transactions(v_uid, 2)::jsonb;
  if jsonb_array_length(v_res) <> 2 then
    v_fail := v_fail + 1;
    raise notice 'FAIL get_recent_transactions limit=2: got %', jsonb_array_length(v_res);
  end if;

  -- limit is clamped, not rejected: 0 -> 1 row, 500 -> all rows
  v_res := public.get_recent_transactions(v_uid, 0)::jsonb;
  if jsonb_array_length(v_res) <> 1 then
    v_fail := v_fail + 1;
    raise notice 'FAIL get_recent_transactions clamp low: got %', jsonb_array_length(v_res);
  end if;

  v_res := public.get_recent_transactions(v_uid, 500)::jsonb;
  if jsonb_array_length(v_res) <> 5 then
    v_fail := v_fail + 1;
    raise notice 'FAIL get_recent_transactions clamp high: got %', jsonb_array_length(v_res);
  end if;

  -- empty history -> []
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_other_uid, 'role', 'authenticated')::text, false);
  v_res := public.get_recent_transactions(v_other_uid)::jsonb;
  if v_res is null or jsonb_array_length(v_res) <> 0 then
    v_fail := v_fail + 1;
    raise notice 'FAIL get_recent_transactions empty: expected [], got %', v_res;
  end if;

  -- ══════════════════════════════════════════════════════════════════════
  -- owner guard on the remaining three RPCs
  -- ══════════════════════════════════════════════════════════════════════
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_other_uid, 'role', 'authenticated')::text, false);

  v_guard_raised := false;
  begin
    perform public.get_budgets(v_uid, 2026, 10);
  exception when others then
    v_guard_raised := sqlerrm ilike '%Not authorized%';
  end;
  if not v_guard_raised then
    v_fail := v_fail + 1;
    raise notice 'FAIL get_budgets guard: mismatched auth.uid() did not raise';
  end if;

  v_guard_raised := false;
  begin
    perform public.get_goals(v_uid);
  exception when others then
    v_guard_raised := sqlerrm ilike '%Not authorized%';
  end;
  if not v_guard_raised then
    v_fail := v_fail + 1;
    raise notice 'FAIL get_goals guard: mismatched auth.uid() did not raise';
  end if;

  v_guard_raised := false;
  begin
    perform public.get_recent_transactions(v_uid);
  exception when others then
    v_guard_raised := sqlerrm ilike '%Not authorized%';
  end;
  if not v_guard_raised then
    v_fail := v_fail + 1;
    raise notice 'FAIL get_recent_transactions guard: mismatched auth.uid() did not raise';
  end if;

  -- ══════════════════════════════════════════════════════════════════════
  -- privileges (PUBLIC/anon denied, authenticated+service_role allowed)
  -- ══════════════════════════════════════════════════════════════════════
  if has_function_privilege('anon', 'public.get_debts(uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.get_budgets(uuid,int,int)', 'EXECUTE')
     or has_function_privilege('anon', 'public.get_goals(uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.get_recent_transactions(uuid,int)', 'EXECUTE') then
    v_fail := v_fail + 1;
    raise notice 'FAIL privileges: anon can execute an agent read RPC';
  end if;

  if not has_function_privilege('authenticated', 'public.get_debts(uuid)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.get_budgets(uuid,int,int)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.get_goals(uuid)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.get_recent_transactions(uuid,int)', 'EXECUTE') then
    v_fail := v_fail + 1;
    raise notice 'FAIL privileges: authenticated cannot execute an agent read RPC';
  end if;

  if not has_function_privilege('service_role', 'public.get_debts(uuid)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.get_budgets(uuid,int,int)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.get_goals(uuid)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.get_recent_transactions(uuid,int)', 'EXECUTE') then
    v_fail := v_fail + 1;
    raise notice 'FAIL privileges: service_role cannot execute an agent read RPC';
  end if;

  -- ── summary + rollback (fixtures never persist) ─────────────────────────
  raise notice '---------------------------------------------';
  raise notice 'agent read tools verification: % failure(s)', v_fail;
  if v_fail > 0 then
    raise exception 'VERIFICATION FAILED (% failures)', v_fail;
  end if;
  raise notice 'ALL CHECKS PASSED';
  raise notice '---------------------------------------------';
end $$;

rollback; -- scratch users + rows removed; DB left as found
