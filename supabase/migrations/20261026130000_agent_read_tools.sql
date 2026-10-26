-- Migration: 20261026130000_agent_read_tools.sql
-- Purpose: Phase 1 read tools for the Agentic AI Executive Assistant. The agent
--   could not answer four everyday questions, so this migration adds the RPCs
--   behind them:
--     * get_debts                — "how much debt do I have, what is due next?"
--     * get_budgets              — "am I over budget this month?"
--     * get_goals                — "how close am I to my savings goals?"
--     * get_recent_transactions  — "what did I spend recently?"
--
--   All four return a JSON ARRAY (the tool registry forwards the value as-is),
--   with amounts already in the user's profile (base) currency. The math stays
--   in SQL — the registry never re-aggregates (Critical Rules 10/11).
--
-- Schema notes (verified against the migrations, NOT against prod):
--   * `debts` stores `original_amount` / `remaining_amount` / `due_date` /
--     `payment_day`; the tool contract calls them `total_amount` /
--     `remaining_balance` / `end_date` / `next_due_date`.
--   * `savings_goals` is the real table name behind the `get_goals` tool.
--   * `budgets` math is NOT duplicated here: `get_budgets` reads the category
--     rows already produced by `get_spending_breakdown` (20261024000000) and
--     keeps only categories that actually have a budget row.
--   * Every table has `deleted_at` (034_soft_delete_columns) and every query
--     filters it, so soft-deleted rows never leak into an answer.
--
-- SECURITY: identical convention to 20261024000000 / 20261019000000 —
--   * SECURITY DEFINER + owner guard:
--       auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id
--     -> a session caller can only read their own rows (mismatch raises),
--        while service_role (no JWT → NULL uid) may read any user for the MCP
--        path and crons.
--   * EXECUTE revoked from PUBLIC/anon, granted to authenticated +
--     service_role. anon has no privilege at all.
--   * No table or column is created/modified: purely additive RPCs.
--
-- NOT APPLIED to production as part of this task.
--
-- Verification (local only, never production):
--   1. supabase db reset            (or a scratch local database)
--   2. psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 \
--        -f supabase/tests/agent_read_tools_test.sql

begin;

-- ══════════════════════════════════════════════════════════════════════════
-- get_debts(p_user_id uuid) -> json array
--   Active (unpaid, not deleted) debts and receivables.
--   `end_date` mirrors `debts.due_date`; `next_due_date` is derived from
--   `payment_day` (next occurrence on/after today, month-end clamped) and
--   falls back to `due_date` when it is today or later.
-- ══════════════════════════════════════════════════════════════════════════

create or replace function public.get_debts(p_user_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_result json;
begin
  -- NULL uid = service_role/cron caller: allowed.
  -- Non-NULL uid must match the requested user (owner verification).
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
      -- This month's instalment date, clamped to the month's last day
      -- (payment_day = 31 in February becomes the 28th/29th).
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
        -- date + interval clamps to the next month's last day (Jan 31 → Feb 28).
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

comment on function public.get_debts(uuid) is
  'Agent tool backing RPC: active debts/receivables (unpaid, not soft-deleted) with remaining balance, monthly payment, end date and next due date. Base-currency amounts.';

-- ══════════════════════════════════════════════════════════════════════════
-- get_budgets(p_user_id uuid, p_year int, p_month int) -> json array
--   Budgeted categories for one Gregorian month: limit, spend, remaining and
--   percent used. Reuses get_spending_breakdown so the budget math exists once.
-- ══════════════════════════════════════════════════════════════════════════

create or replace function public.get_budgets(
  p_user_id uuid,
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

  -- get_spending_breakdown validates p_year/p_month and raises on bad input,
  -- so this function inherits the same 2000..2100 / 1..12 contract.
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
    -- Budget-less spend categories are not "budgets"; drop them.
    where (elem ->> 'budget_limit') is not null
  ) b;

  return v_result;
end;
$function$;

comment on function public.get_budgets(uuid, int, int) is
  'Agent tool backing RPC: per-category budget limit/spent/remaining/percentage for one month. Reuses get_spending_breakdown; only categories with a budget row are returned. Base-currency amounts.';

-- ══════════════════════════════════════════════════════════════════════════
-- get_goals(p_user_id uuid) -> json array
--   Savings goals (savings_goals) with target, saved, target date and percent.
-- ══════════════════════════════════════════════════════════════════════════

create or replace function public.get_goals(p_user_id uuid)
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

comment on function public.get_goals(uuid) is
  'Agent tool backing RPC: savings goals (savings_goals) with target amount, saved amount, target date and percent complete. Base-currency amounts.';

-- ══════════════════════════════════════════════════════════════════════════
-- get_recent_transactions(p_user_id uuid, p_limit int default 10) -> json array
--   Newest income/expense rows first. `amount` is the base-currency value;
--   `original_amount` / `original_currency` preserve what the user entered.
--   Transfers are excluded: the agent's money model is income vs expense, and
--   counting a transfer as either would distort spending answers.
-- ══════════════════════════════════════════════════════════════════════════

create or replace function public.get_recent_transactions(
  p_user_id uuid,
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

  -- Clamp instead of raising: a runaway model asking for 10 000 rows should get
  -- 100, not an error the user has to read.
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

comment on function public.get_recent_transactions(uuid, int) is
  'Agent tool backing RPC: newest income/expense transactions (soft-deleted and transfers excluded), limit clamped to 1..100. amount is base currency; original_amount/original_currency preserve the entered value.';

-- ══════════════════════════════════════════════════════════════════════════
-- Hardening (20260907081557 / 20261018 convention): no PUBLIC/anon execution.
-- ══════════════════════════════════════════════════════════════════════════

revoke execute on function public.get_debts(uuid) from public, anon;
grant execute on function public.get_debts(uuid) to authenticated, service_role;

revoke execute on function public.get_budgets(uuid, int, int) from public, anon;
grant execute on function public.get_budgets(uuid, int, int) to authenticated, service_role;

revoke execute on function public.get_goals(uuid) from public, anon;
grant execute on function public.get_goals(uuid) to authenticated, service_role;

revoke execute on function public.get_recent_transactions(uuid, int) from public, anon;
grant execute on function public.get_recent_transactions(uuid, int) to authenticated, service_role;

commit;
