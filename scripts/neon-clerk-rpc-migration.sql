-- ============================================================================
-- neon-clerk-rpc-migration.sql
--
-- Migrates all SECURITY DEFINER RPCs from `p_user_id uuid` to `p_user_id text`
-- (or `user_id text` where parameter name differs).
--
-- RUN ORDER (after neon-clerk-schema.sql + neon-clerk-backfill.sql):
--   1. neon-clerk-schema.sql       -- converts columns to text, rebuilds RLS
--   2. neon-clerk-backfill.sql     -- updates ownership data via identity map
--   3. THIS SCRIPT                 -- redefines all RPCs to accept text user IDs
--
-- PREREQUISITES:
--   - neon-clerk-schema.sql must have run first (creates auth.uid() returning text)
--   - auth.jwt() shim must exist (reads request.jwt.claims GUC)
--   - All ownership columns already converted to text
--   - Identity map backfill complete
--
-- This script is a single transaction. Rolls back on any error.
-- ============================================================================

begin;

set local lock_timeout = '30s';
set local search_path = public, pg_temp;

-- ---------------------------------------------------------------------------
-- Helper: verify auth.uid() returns text (created by neon-clerk-schema.sql)
-- ---------------------------------------------------------------------------
do $do$
declare
  ret text;
begin
  ret := pg_get_function_result('auth.uid()'::regprocedure);
  if ret <> 'text' then
    raise exception 'auth.uid() returns %, expected text. Run neon-clerk-schema.sql first.', ret;
  end if;
  raise notice 'auth.uid() returns text ✓';
end
$do$;

-- ============================================================================
-- 1. get_account_balances
-- ============================================================================
create or replace function public.get_account_balances(p_user_id text)
 returns table(account_id uuid, account_name text, current_balance numeric)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  -- Owner guard: compare Clerk sub (from auth.jwt()->>'sub') to text p_user_id
  if auth.uid() is not null and auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized';
  end if;
  return query
  with tx_summary as (
    select
      a.id as acc_id,
      coalesce(sum(case when t.type = 'income'  then t.amount else 0 end), 0) as income,
      coalesce(sum(case when t.type = 'expense' then t.amount else 0 end), 0) as expense,
      coalesce(sum(case when t.type = 'transfer' and t.transfer_to_account_id = a.id then t.amount else 0 end), 0) as xfer_in,
      coalesce(sum(case when t.type = 'transfer' and t.account_id = a.id            then t.amount else 0 end), 0) as xfer_out
    from public.accounts a
    left join public.transactions t
      on (t.account_id = a.id or t.transfer_to_account_id = a.id)
      and t.deleted_at is null
    where a.user_id = p_user_id and a.is_archived = false and a.deleted_at is null
    group by a.id
  )
  select
    a.id,
    a.name,
    (a.opening_balance + s.income - s.expense + s.xfer_in - s.xfer_out)::numeric as current_balance
  from public.accounts a
  join tx_summary s on s.acc_id = a.id
  where a.user_id = p_user_id and a.is_archived = false and a.deleted_at is null;
end;
$function$;

revoke execute on function public.get_account_balances(text) from public, anon;
grant execute on function public.get_account_balances(text) to authenticated, service_role;

-- ============================================================================
-- 2. get_financial_dashboard
-- ============================================================================
create or replace function public.get_financial_dashboard(p_user_id text, p_usd_to_local_rate double precision default 1.0)
 returns json
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if auth.uid() is not null and auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized';
  end if;
  return (
    select json_build_object(
      'net_worth',
        coalesce((select sum(t.current_balance) from public.get_account_balances(p_user_id) as t), 0)
        + coalesce((select sum(shares * current_price) from public.investments where user_id = p_user_id), 0) * p_usd_to_local_rate
        + coalesce((select sum(balance) from public.investment_cash where user_id = p_user_id), 0) * p_usd_to_local_rate
        + coalesce((select sum(current_amount) from public.savings_goals where user_id = p_user_id), 0)
        + coalesce((select sum(remaining_amount) from public.debts where user_id = p_user_id and is_paid = false and debt_type = 'receivable'), 0)
        - coalesce((select sum(remaining_amount) from public.debts where user_id = p_user_id and is_paid = false and debt_type = 'owed'), 0),

      'total_accounts_balance',
        coalesce((select sum(t.current_balance) from public.get_account_balances(p_user_id) as t), 0),

      'investments_value_usd',
        coalesce((select sum(shares * current_price) from public.investments where user_id = p_user_id), 0),

      'investments_value_local',
        coalesce((select sum(shares * current_price) from public.investments where user_id = p_user_id), 0) * p_usd_to_local_rate,

      'investment_cash_local',
        coalesce((select sum(balance) from public.investment_cash where user_id = p_user_id), 0) * p_usd_to_local_rate,

      'goals_saved',
        coalesce((select sum(current_amount) from public.savings_goals where user_id = p_user_id), 0),

      'goals_target',
        coalesce((select sum(target_amount) from public.savings_goals where user_id = p_user_id), 0),

      'total_debt_owed',
        coalesce((select sum(remaining_amount) from public.debts where user_id = p_user_id and is_paid = false and debt_type = 'owed'), 0),

      'total_receivable',
        coalesce((select sum(remaining_amount) from public.debts where user_id = p_user_id and is_paid = false and debt_type = 'receivable'), 0),

      'monthly_debt_commitments',
        coalesce((select sum(monthly_payment) from public.debts where user_id = p_user_id and is_paid = false and auto_deduct = true and debt_type = 'owed'), 0),

      'unread_alerts',
        coalesce((select count(*)::integer from public.alerts where user_id = p_user_id and is_read = false), 0),

      'health_score', 0
    )
  );
end;
$function$;

revoke execute on function public.get_financial_dashboard(text, double precision) from public, anon;
grant execute on function public.get_financial_dashboard(text, double precision) to authenticated, service_role;

-- ============================================================================
-- 3. get_monthly_financial_summary
-- ============================================================================
create or replace function public.get_monthly_financial_summary(p_user_id text, p_year integer default null::integer, p_month integer default null::integer)
 returns json
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_year int := coalesce(p_year, extract(year from now())::int);
  v_month int := coalesce(p_month, extract(month from now())::int);
  v_income numeric := 0;
  v_expenses numeric := 0;
  v_debt_payments numeric := 0;
  v_net numeric := 0;
begin
  if auth.uid() is not null and auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized';
  end if;
  select
    coalesce(sum(case when t.type = 'income' then t.amount else 0 end), 0),
    coalesce(sum(case when t.type = 'expense' then t.amount else 0 end), 0)
  into v_income, v_expenses
  from public.transactions t
  where t.user_id = p_user_id
    and extract(year from t.transaction_date)::int = v_year
    and extract(month from t.transaction_date)::int = v_month;

  select coalesce(sum(d.monthly_payment), 0)
  into v_debt_payments
  from public.debts d
  where d.user_id = p_user_id
    and d.is_paid = false;

  v_net := v_income - v_expenses - v_debt_payments;

  return json_build_object(
    'year', v_year,
    'month', v_month,
    'income', v_income,
    'expenses', v_expenses,
    'debt_payments', v_debt_payments,
    'net', v_net
  );
end;
$function$;

revoke execute on function public.get_monthly_financial_summary(text, integer, integer) from public, anon;
grant execute on function public.get_monthly_financial_summary(text, integer, integer) to authenticated, service_role;

-- ============================================================================
-- 4. get_zakat_summary
-- ============================================================================
create or replace function public.get_zakat_summary(
  p_user_id text,
  p_gold_price_per_gram double precision,
  p_silver_price_per_gram double precision,
  p_usd_to_local_rate double precision default 1.0
)
 returns json
 language plpgsql
 security definer
 set search_path to 'pg_catalog', 'public', 'auth', 'pg_temp'
as $function$
declare
  v_dash json;
  v_nisab_gold numeric;
  v_nisab_silver numeric;
  v_nisab_effective numeric;
  v_zakatable_raw numeric;
  v_zakatable_assets numeric;
  v_zakat_due numeric;
  v_is_eligible boolean;
  v_cash numeric;
  v_investments numeric;
  v_investment_cash numeric;
  v_goals numeric;
  v_debts numeric;
  v_gold numeric;
  v_silver numeric;
  v_other numeric;
begin
  if auth.uid() is not null and auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized';
  end if;

  v_dash := public.get_financial_dashboard(p_user_id, p_usd_to_local_rate);

  v_cash            := coalesce((v_dash->>'total_accounts_balance')::numeric, 0);
  v_investments     := coalesce((v_dash->>'investments_value_local')::numeric, 0);
  v_investment_cash := coalesce((v_dash->>'investment_cash_local')::numeric, 0);
  v_goals           := coalesce((v_dash->>'goals_saved')::numeric, 0);
  v_debts           := coalesce((v_dash->>'total_debt_owed')::numeric, 0);

  select
    coalesce(sum(case when h.asset_type = 'gold'
                      then (h.grams * p_gold_price_per_gram)::numeric else 0 end), 0),
    coalesce(sum(case when h.asset_type = 'silver'
                      then (h.grams * p_silver_price_per_gram)::numeric else 0 end), 0),
    coalesce(sum(case when h.asset_type in ('real_estate', 'inventory', 'other')
                      then coalesce(h.value_usd, 0) else 0 end), 0) * p_usd_to_local_rate
  into v_gold, v_silver, v_other
  from public.zakat_holdings h
  where h.user_id = p_user_id;

  v_nisab_gold    := 85 * p_gold_price_per_gram;
  v_nisab_silver  := 595 * p_silver_price_per_gram;
  v_nisab_effective := least(v_nisab_gold, v_nisab_silver);

  v_zakatable_raw := v_cash + v_investments + v_investment_cash + v_goals
                     + v_gold + v_silver + v_other - v_debts;

  v_zakatable_assets := greatest(v_zakatable_raw, 0);

  if v_zakatable_assets >= v_nisab_effective then
    v_is_eligible := true;
    v_zakat_due := v_zakatable_assets * 0.025;
  else
    v_is_eligible := false;
    v_zakat_due := 0;
  end if;

  return json_build_object(
    'is_eligible', v_is_eligible,
    'zakat_due', v_zakat_due,
    'zakatable_assets', v_zakatable_assets,
    'nisab_gold', v_nisab_gold,
    'nisab_silver', v_nisab_silver,
    'nisab_effective', v_nisab_effective,
    'components', json_build_object(
      'cash', v_cash,
      'investments', v_investments,
      'investment_cash', v_investment_cash,
      'goals', v_goals,
      'gold', v_gold,
      'silver', v_silver,
      'other', v_other,
      'debts', v_debts
    ),
    'engine_version', 2
  );
end;
$function$;

revoke execute on function public.get_zakat_summary(text, double precision, double precision, double precision) from public, anon;
grant execute on function public.get_zakat_summary(text, double precision, double precision, double precision) to authenticated, service_role;

-- ============================================================================
-- 5. delete_user_account (parameter named user_id, not p_user_id)
-- ============================================================================
create or replace function public.delete_user_account(user_id text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if auth.uid() is not null and auth.uid() is distinct from user_id then
    raise exception 'Not authorized';
  end if;
  delete from public.debt_payments           where debt_payments.user_id = user_id;
  delete from public.investment_transactions where investment_transactions.user_id = user_id;
  delete from public.transactions            where transactions.user_id = user_id;
  delete from public.debts                   where debts.user_id = user_id;
  delete from public.investments             where investments.user_id = user_id;
  delete from public.budgets                 where budgets.user_id = user_id;
  delete from public.savings_goals           where savings_goals.user_id = user_id;
  delete from public.alerts                  where alerts.user_id = user_id;
  delete from public.push_subscriptions      where push_subscriptions.user_id = user_id;
  delete from public.profiles                where profiles.id = user_id;
  -- NOTE: auth.users is managed by Clerk now; DO NOT DELETE from auth.users here
  -- delete from auth.users where id = user_id;  -- COMMENTED OUT: Clerk owns auth
end;
$function$;

revoke execute on function public.delete_user_account(text) from public, anon;
grant execute on function public.delete_user_account(text) to authenticated, service_role;

-- ============================================================================
-- 6. upsert_investment_cash
-- ============================================================================
create or replace function public.upsert_investment_cash(p_user_id text, p_currency text, p_amount numeric)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if auth.uid() is not null and auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized';
  end if;
  insert into public.investment_cash (user_id, currency, balance)
  values (p_user_id, p_currency, p_amount)
  on conflict (user_id, currency)
  do update set
    balance = public.investment_cash.balance + p_amount,
    updated_at = now();
end;
$function$;

revoke execute on function public.upsert_investment_cash(text, text, numeric) from public, anon;
grant execute on function public.upsert_investment_cash(text, text, numeric) to authenticated, service_role;

-- ============================================================================
-- 7. get_changed_records (offline sync)
-- ============================================================================
create or replace function public.get_changed_records(
  p_user_id text,
  p_table_name text,
  p_since timestamptz,
  p_page_size int default 1000,
  p_offset int default 0
)
 returns table (
   id uuid,
   data jsonb,
   operation text,
   changed_at timestamptz
 )
 language plpgsql
 security definer
 set search_path = public
as $function$
begin
  if auth.uid() is not null and auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized';
  end if;
  return query execute format(
    'select t.id, to_jsonb(t)::jsonb,
       case when t.deleted_at is not null then ''delete''
            when t.created_at = t.updated_at then ''create''
            else ''update'' end,
       coalesce(t.updated_at, t.created_at)
     from public.%I t
     where t.user_id = $1
       and (t.deleted_at is null or t.deleted_at > $2)
       and coalesce(t.updated_at, t.created_at) > $2
     order by coalesce(t.updated_at, t.created_at)
     limit $3 offset $4',
    p_table_name
  ) using p_user_id, p_since, p_page_size, p_offset;
end;
$function$;

revoke execute on function public.get_changed_records(text, text, timestamptz, int, int) from public, anon;
grant execute on function public.get_changed_records(text, text, timestamptz, int, int) to authenticated, service_role;

-- ============================================================================
-- 8. get_deleted_records (offline sync)
-- ============================================================================
create or replace function public.get_deleted_records(
  p_user_id text,
  p_table_name text,
  p_since timestamptz
)
 returns table (id uuid, deleted_at timestamptz)
 language plpgsql
 security definer
 set search_path = public
as $function$
begin
  if auth.uid() is not null and auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized';
  end if;
  return query execute format(
    'select t.id, t.deleted_at
     from public.%I t
     where t.user_id = $1
       and t.deleted_at is not null
       and t.deleted_at > $2',
    p_table_name
  ) using p_user_id, p_since;
end;
$function$;

revoke execute on function public.get_deleted_records(text, text, timestamptz) from public, anon;
grant execute on function public.get_deleted_records(text, text, timestamptz) to authenticated, service_role;

-- ============================================================================
-- 9. calculate_health_score
-- ============================================================================
create or replace function public.calculate_health_score(
  p_user_id text,
  p_usd_to_local_rate double precision default 1.0
)
 returns integer
 language plpgsql
 security definer
 set search_path = public
as $function$
declare
  v_income numeric;
  v_expenses numeric;
  v_savings_rate numeric;
  v_total_debt numeric;
  v_debt_ratio numeric;
  v_goals_saved numeric;
  v_emergency_ratio numeric;
  v_inv_value numeric;
  v_tx_count integer;
  v_score integer := 0;
  v_first_day_of_month date;
begin
  if auth.uid() is not null and auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized';
  end if;

  v_first_day_of_month := date_trunc('month', now())::date;

  select
    coalesce(sum(case when type = 'income' then amount else 0 end), 0),
    coalesce(sum(case when type = 'expense' then amount else 0 end), 0)
  into v_income, v_expenses
  from public.transactions
  where user_id = p_user_id and transaction_date >= v_first_day_of_month;

  if v_income = 0 then
    select coalesce(monthly_income, 0) into v_income
    from public.profiles where id = p_user_id;
  end if;

  if v_income > 0 then
    v_savings_rate := (v_income - v_expenses) / v_income;
    if v_savings_rate >= 0.2 then v_score := v_score + 30;
    elsif v_savings_rate >= 0.1 then v_score := v_score + 20;
    elsif v_savings_rate > 0 then v_score := v_score + 10;
    end if;
  end if;

  select coalesce(sum(remaining_amount), 0) into v_total_debt
  from public.debts where user_id = p_user_id and is_paid = false and debt_type = 'owed';

  if v_income > 0 then
    v_debt_ratio := v_total_debt / (v_income * 12);
    if v_debt_ratio = 0 then v_score := v_score + 25;
    elsif v_debt_ratio < 0.3 then v_score := v_score + 20;
    elsif v_debt_ratio < 0.6 then v_score := v_score + 10;
    end if;
  else
    if v_total_debt = 0 then v_score := v_score + 25; end if;
  end if;

  select coalesce(sum(current_amount), 0) into v_goals_saved
  from public.savings_goals where user_id = p_user_id;

  if v_income > 0 then
    v_emergency_ratio := v_goals_saved / (v_income * 3);
    if v_emergency_ratio >= 1.0 then v_score := v_score + 20;
    elsif v_emergency_ratio >= 0.5 then v_score := v_score + 12;
    elsif v_emergency_ratio > 0 then v_score := v_score + 6;
    end if;
  end if;

  select coalesce(sum(shares * current_price), 0) into v_inv_value
  from public.investments where user_id = p_user_id;

  if v_inv_value > 0 then v_score := v_score + 15; end if;

  select count(*) into v_tx_count
  from public.transactions
  where user_id = p_user_id
    and transaction_date >= (now() - interval '30 days')::date;

  if v_tx_count >= 10 then v_score := v_score + 10;
  elsif v_tx_count >= 5 then v_score := v_score + 6;
  elsif v_tx_count > 0 then v_score := v_score + 3;
  end if;

  return least(v_score, 100);
end;
$function$;

revoke execute on function public.calculate_health_score(text, double precision) from public, anon;
grant execute on function public.calculate_health_score(text, double precision) to authenticated, service_role;

-- ============================================================================
-- 10. get_health_score
-- ============================================================================
create or replace function public.get_health_score(p_user_id text)
 returns integer
 language plpgsql
 security definer
 set search_path = public
as $function$
declare
  v_score integer;
begin
  if auth.uid() is not null and auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized';
  end if;

  select score into v_score
  from public.health_score_history
  where user_id = p_user_id
  order by recorded_at desc
  limit 1;

  return coalesce(v_score, 0);
end;
$function$;

revoke execute on function public.get_health_score(text) from public, anon;
grant execute on function public.get_health_score(text) to authenticated, service_role;

-- ============================================================================
-- 11. check_and_reserve_idempotency_key
-- ============================================================================
create or replace function public.check_and_reserve_idempotency_key(
  p_user_id text,
  p_key_hash text,
  p_expires_at timestamptz default (now() + interval '24 hours')
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_record public.idempotency_keys%rowtype;
begin
  if auth.uid() is not null and auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized';
  end if;

  begin
    insert into public.idempotency_keys (user_id, key_hash, expires_at)
    values (p_user_id, p_key_hash, p_expires_at)
    on conflict (user_id, key_hash) do nothing
    returning * into existing_record;

    if found then
      return jsonb_build_object('status', 'available');
    end if;
  exception when others then
  end;

  select * into existing_record
  from public.idempotency_keys
  where user_id = p_user_id and key_hash = p_key_hash;

  if not found then
    return jsonb_build_object('status', 'available');
  end if;

  if existing_record.transaction_id is not null then
    return jsonb_build_object(
      'status', 'duplicate',
      'transaction_id', existing_record.transaction_id
    );
  else
    return jsonb_build_object('status', 'processing');
  end if;
end;
$$;

revoke execute on function public.check_and_reserve_idempotency_key(text, text, timestamptz) from public, anon;
grant execute on function public.check_and_reserve_idempotency_key(text, text, timestamptz) to authenticated, service_role;

-- ============================================================================
-- 12. complete_idempotency_key
-- ============================================================================
create or replace function public.complete_idempotency_key(
  p_user_id text,
  p_key_hash text,
  p_transaction_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized';
  end if;

  update public.idempotency_keys
  set transaction_id = p_transaction_id
  where user_id = p_user_id and key_hash = p_key_hash;
end;
$$;

revoke execute on function public.complete_idempotency_key(text, text, uuid) from public, anon;
grant execute on function public.complete_idempotency_key(text, text, uuid) to authenticated, service_role;

-- ============================================================================
-- 13. sync_zakat_haul_state
-- ============================================================================
create or replace function public.sync_zakat_haul_state(
  p_user_id text,
  p_gold_price numeric default 30,
  p_silver_price numeric default 0.35,
  p_fx_rate numeric default 1.0
)
 returns json
 language plpgsql
 security definer
 set search_path to 'pg_catalog', 'public', 'auth', 'pg_temp'
as $function$
declare
  v_summary     json;
  v_assets      numeric;
  v_nisab       numeric;
  v_due_amount  numeric;
  v_reached_at  timestamptz;
  v_haul_due_at timestamptz;
  v_result      json;
begin
  if auth.uid() is not null and auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized';
  end if;

  v_summary := public.get_zakat_summary(
    p_user_id,
    p_gold_price::double precision,
    p_silver_price::double precision,
    p_fx_rate::double precision
  );

  v_assets     := coalesce((v_summary->>'zakatable_assets')::numeric, 0);
  v_nisab      := coalesce((v_summary->>'nisab_effective')::numeric, 0);
  v_due_amount := coalesce((v_summary->>'zakat_due')::numeric, 0);

  if v_assets >= v_nisab then
    select t.nisab_reached_at into v_reached_at
    from public.zakat_haul_tracking t
    where t.user_id = p_user_id;

    if v_reached_at is null then
      v_reached_at := now();
    end if;
    v_haul_due_at := v_reached_at + interval '354 days';
  else
    v_reached_at  := null;
    v_haul_due_at := null;
  end if;

  insert into public.zakat_haul_tracking (user_id, nisab_reached_at, current_haul_due_at)
  values (p_user_id, v_reached_at, v_haul_due_at)
  on conflict (user_id) do update
    set nisab_reached_at    = excluded.nisab_reached_at,
        current_haul_due_at = excluded.current_haul_due_at;

  select json_build_object(
    'user_id',             t.user_id,
    'nisab_reached_at',    t.nisab_reached_at,
    'current_haul_due_at', t.current_haul_due_at,
    'last_notified_at',    t.last_notified_at,
    'days_remaining',      case when t.current_haul_due_at is null then null
                                else extract(day from t.current_haul_due_at - now())::int end,
    'is_eligible',         v_assets >= v_nisab,
    'zakatable_assets',    v_assets,
    'nisab_effective',     v_nisab,
    'zakat_due',           v_due_amount
  ) into v_result
  from public.zakat_haul_tracking t
  where t.user_id = p_user_id;

  return v_result;
end;
$function$;

revoke execute on function public.sync_zakat_haul_state(text, numeric, numeric, numeric) from public, anon;
grant execute on function public.sync_zakat_haul_state(text, numeric, numeric, numeric) to authenticated, service_role;

-- ============================================================================
-- 14. get_zakat_hauls
-- ============================================================================
create or replace function public.get_zakat_hauls(p_user_id text)
 returns json
 language plpgsql
 security definer
 set search_path to 'pg_catalog', 'public', 'auth', 'pg_temp'
as $function$
declare
  v_result json;
begin
  if auth.uid() is not null and auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized';
  end if;

  select coalesce(json_agg(item order by item.haul_date), '[]'::json)
  into v_result
  from (
    select
      'investment'::text as source,
      i.id::text as ref_id,
      coalesce(i.symbol, i.name) as label,
      null::text as asset_type,
      null::numeric as grams,
      (i.shares * i.current_price) as value_usd,
      (coalesce(i.purchase_date, i.created_at::date) + 354) as haul_date,
      (coalesce(i.purchase_date, i.created_at::date) + 354 - current_date) as days_remaining
    from public.investments i
    where i.user_id = p_user_id
    union all
    select
      'holding'::text,
      h.id::text,
      h.asset_type,
      h.asset_type,
      h.grams,
      h.value_usd,
      (coalesce(h.purchase_date, h.created_at::date) + 354),
      (coalesce(h.purchase_date, h.created_at::date) + 354 - current_date)
    from public.zakat_holdings h
    where h.user_id = p_user_id
      and h.asset_type in ('gold', 'silver')
  ) item;
  return v_result;
end;
$function$;

revoke execute on function public.get_zakat_hauls(text) from public, anon;
grant execute on function public.get_zakat_hauls(text) to authenticated, service_role;

-- ============================================================================
-- 15. get_debts (Agent read tool)
-- ============================================================================
create or replace function public.get_debts(p_user_id text)
 returns json
 language plpgsql
 security definer
 set search_path = public
as $function$
declare
  v_result json;
begin
  if auth.uid() is not null and auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized';
  end if;

  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;

  with active as (
    select
      d.id,
      d.name,
      d.original_amount,
      d.remaining_amount,
      coalesce(d.monthly_payment, 0) as monthly_payment,
      d.due_date,
      d.payment_day,
      d.debt_type,
      d.is_paid,
      d.priority,
      case
        when d.payment_day is not null then
          make_date(
            extract(year from current_date)::int,
            extract(month from current_date)::int,
            least(
              d.payment_day,
              extract(
                day from (date_trunc('month', current_date) + interval '1 month' - interval '1 day')
              )::int
            )
          )
      end as this_month_due
    from public.debts d
    where d.user_id = p_user_id
      and d.deleted_at is null
      and coalesce(d.is_paid, false) = false
  ),
  computed as (
    select
      a.id,
      a.name,
      a.original_amount::numeric  as total_amount,
      a.remaining_amount::numeric as remaining_balance,
      a.monthly_payment::numeric  as monthly_payment,
      a.due_date                  as end_date,
      case
        when a.this_month_due is null then
          case
            when a.due_date is not null and a.due_date >= current_date then a.due_date
          end
        when a.this_month_due >= current_date then a.this_month_due
        else (a.this_month_due + interval '1 month')::date
      end as next_due_date,
      a.debt_type,
      a.is_paid,
      a.priority
    from active a
  )
  select coalesce(json_agg(d order by d.remaining_balance desc, d.name), '[]'::json)
  into v_result
  from computed d;

  return v_result;
end;
$function$;

revoke execute on function public.get_debts(text) from public, anon;
grant execute on function public.get_debts(text) to authenticated, service_role;

-- ============================================================================
-- 16. get_budgets (Agent read tool)
-- ============================================================================
create or replace function public.get_budgets(
  p_user_id text,
  p_year int,
  p_month int
)
 returns json
 language plpgsql
 security definer
 set search_path = public
as $function$
declare
  v_result json;
begin
  if auth.uid() is not null and auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized';
  end if;

  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;

  select coalesce(json_agg(b order by b.category), '[]'::json)
  into v_result
  from (
    select
      (elem ->> 'category')              as category,
      (elem ->> 'budget_limit')::numeric as monthly_limit,
      (elem ->> 'spent')::numeric        as spent,
      (elem ->> 'remaining')::numeric    as remaining,
      (elem ->> 'pct_used')::numeric     as percentage
    from json_array_elements(
      public.get_spending_breakdown(p_user_id, p_year, p_month) -> 'categories'
    ) as elem
    where (elem ->> 'budget_limit') is not null
  ) b;

  return v_result;
end;
$function$;

revoke execute on function public.get_budgets(text, int, int) from public, anon;
grant execute on function public.get_budgets(text, int, int) to authenticated, service_role;

-- ============================================================================
-- 17. get_goals (Agent read tool)
-- ============================================================================
create or replace function public.get_goals(p_user_id text)
 returns json
 language plpgsql
 security definer
 set search_path = public
as $function$
declare
  v_result json;
begin
  if auth.uid() is not null and auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized';
  end if;

  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;

  select coalesce(json_agg(g order by g.target_date nulls last, g.name), '[]'::json)
  into v_result
  from (
    select
      s.id,
      s.name,
      s.target_amount::numeric           as target_amount,
      coalesce(s.current_amount, 0)::numeric as current_amount,
      s.target_date,
      case
        when s.target_amount is null or s.target_amount = 0 then null
        else round((coalesce(s.current_amount, 0) / s.target_amount) * 100, 1)
      end as percentage
    from public.savings_goals s
    where s.user_id = p_user_id
      and s.deleted_at is null
  ) g;

  return v_result;
end;
$function$;

revoke execute on function public.get_goals(text) from public, anon;
grant execute on function public.get_goals(text) to authenticated, service_role;

-- ============================================================================
-- 18. get_recent_transactions (Agent read tool)
-- ============================================================================
create or replace function public.get_recent_transactions(
  p_user_id text,
  p_limit int default 10
)
 returns json
 language plpgsql
 security definer
 set search_path = public
as $function$
declare
  v_limit  int;
  v_result json;
begin
  if auth.uid() is not null and auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized';
  end if;

  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;

  v_limit := greatest(1, least(coalesce(p_limit, 10), 100));

  select coalesce(
           json_agg(t order by t.transaction_date desc, t.created_at desc),
           '[]'::json
         )
  into v_result
  from (
    select
      tx.id,
      tx.amount::numeric as amount,
      tx.type,
      tx.category,
      tx.description,
      tx.transaction_date as date,
      tx.original_amount::numeric as original_amount,
      tx.original_currency,
      tx.created_at
    from public.transactions tx
    where tx.user_id = p_user_id
      and tx.deleted_at is null
      and tx.type in ('income', 'expense')
    order by tx.transaction_date desc, tx.created_at desc
    limit v_limit
  ) t;

  return v_result;
end;
$function$;

revoke execute on function public.get_recent_transactions(text, int) from public, anon;
grant execute on function public.get_recent_transactions(text, int) to authenticated, service_role;

-- ============================================================================
-- 19. get_spending_breakdown (Agent read tool, called by get_budgets)
-- ============================================================================
create or replace function public.get_spending_breakdown(
  p_user_id text,
  p_year int,
  p_month int
)
 returns json
 language plpgsql
 security definer
 set search_path = public
as $function$
declare
  v_start     date;
  v_end       date;
  v_currency  text;
  v_total     numeric := 0;
  v_budget    numeric := 0;
  v_categories json;
begin
  if auth.uid() is not null and auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized';
  end if;

  if p_year is null or p_year < 2000 or p_year > 2100 then
    raise exception 'Invalid year: %', p_year;
  end if;
  if p_month is null or p_month < 1 or p_month > 12 then
    raise exception 'Invalid month: %', p_month;
  end if;

  v_start := make_date(p_year, p_month, 1);
  v_end   := (v_start + interval '1 month')::date;

  select coalesce(p.currency, 'JOD')
  into v_currency
  from public.profiles p
  where p.id = p_user_id;
  v_currency := coalesce(v_currency, 'JOD');

  with spend as (
    select
      t.category,
      sum(t.amount)::numeric as spent,
      count(*)::integer      as transaction_count
    from public.transactions t
    where t.user_id = p_user_id
      and t.type = 'expense'
      and t.deleted_at is null
      and t.transaction_date >= v_start
      and t.transaction_date <  v_end
    group by t.category
  ),
  budget as (
    select
      b.category,
      b.monthly_limit::numeric as budget_limit
    from public.budgets b
    where b.user_id = p_user_id
      and b.year = p_year
      and b.month = p_month
  ),
  merged as (
    select
      coalesce(s.category, b.category)                        as category,
      coalesce(s.spent, 0)::numeric                           as spent,
      coalesce(s.transaction_count, 0)                        as transaction_count,
      b.budget_limit                                          as budget_limit,
      case
        when b.budget_limit is null then null
        else (b.budget_limit - coalesce(s.spent, 0))::numeric
      end                                                     as remaining,
      case
        when b.budget_limit is null or b.budget_limit = 0 then null
        else round((coalesce(s.spent, 0) / b.budget_limit) * 100, 1)
      end                                                     as pct_used
    from spend s
    full outer join budget b on b.category = s.category
  )
  select
    coalesce(sum(m.spent), 0)::numeric,
    coalesce(sum(m.budget_limit), 0)::numeric,
    coalesce(json_agg(m order by m.spent desc, m.category), '[]'::json)
  into v_total, v_budget, v_categories
  from merged m;

  return json_build_object(
    'ok', true,
    'year', p_year,
    'month', p_month,
    'currency', v_currency,
    'total_expense', v_total,
    'total_budget', v_budget,
    'budget_remaining', v_budget - v_total,
    'category_count', json_array_length(v_categories),
    'categories', v_categories
  );
end;
$function$;

revoke execute on function public.get_spending_breakdown(text, int, int) from public, anon;
grant execute on function public.get_spending_breakdown(text, int, int) to authenticated, service_role;

-- ============================================================================
-- 20. cleanup_expired_idempotency_keys (no user_id parameter — unchanged signature)
-- ============================================================================
create or replace function public.cleanup_expired_idempotency_keys()
 returns integer
 language plpgsql
 security definer
as $$
declare
  deleted_count integer;
begin
  delete from public.idempotency_keys
  where expires_at < now()
  returning 1 into deleted_count;

  return coalesce(deleted_count, 0);
end;
$$;

grant execute on function public.cleanup_expired_idempotency_keys() to authenticated, service_role;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- List all functions that still have uuid user-id parameters (should be zero)
select p.proname, pg_get_function_arguments(p.oid)
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prokind = 'f'
  and pg_get_function_arguments(p.oid) like '%uuid%'
order by p.proname;

-- Summary
raise notice 'RPC migration complete. All p_user_id/user_id parameters converted from uuid to text.';
raise notice 'Owner guards now compare auth.uid() (text, from Clerk sub) directly to p_user_id (text).';
raise notice 'Run app with Clerk JWT to verify RLS + RPC behavior.';

commit;

-- ============================================================================
-- POST-MIGRATION NOTES
-- ============================================================================
-- 1. The app's TypeScript types for supabase.rpc() calls must be updated:
--    - p_user_id: string (was UUID)
--    - user_id: string (was UUID)
--
-- 2. Client code using createClerkClient() will pass Clerk's `sub` (e.g., "user_2abc...")
--    which now matches the text columns and RPC parameters exactly.
--
-- 3. Service-role / cron callers (NULL auth.uid()) are unaffected: they can still
--    call any user's RPC by passing the target user's Clerk sub as text.
--
-- 4. Any LANGUAGE sql RPCs that inlined auth.uid() would have blocked
--    neon-clerk-schema.sql step 7. All current RPCs are plpgsql, so this was not
--    an issue. If new LANGUAGE sql RPCs are added later, they must use
--    (auth.jwt() ->> 'sub')::text instead of auth.uid().
-- ============================================================================