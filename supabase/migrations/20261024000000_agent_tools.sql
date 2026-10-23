-- Migration: 20261024000000_agent_tools.sql
-- Purpose: Phase B (Agentic AI Executive Assistant) Step 1 — add the read RPC
--   that backs the agent tool `get_spending_breakdown`:
--     "how much did I spend per category this month, and how much budget is
--      left?"
--
--   Aggregation stays in SQL (project convention: Zakat/analytics math is
--   never duplicated in web, mobile, or the agent loop). The RPC:
--     - sums `expenses` for the requested Gregorian month, in the user's base
--       currency (`transactions.amount` is always the base-currency value;
--       the entered amount/currency live in original_amount/original_currency)
--     - left-joins the month's budgets so each category reports limit,
--       remaining, and percent used in the same response
--     - keeps budgeted categories with zero spend (remaining = full limit)
--     - excludes soft-deleted rows (`deleted_at is null`)
--
-- SECURITY: same convention as 20261019000000 / 20261021000000 —
--   * SECURITY DEFINER + owner guard:
--       auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id
--     -> a session caller can only read their own breakdown (mismatch raises),
--        while service_role (no JWT → NULL uid) may read any user for crons.
--   * EXECUTE revoked from PUBLIC/anon, granted to authenticated +
--     service_role. anon has no privilege at all.
--   * No table or column is created/modified: purely additive RPC.
--
-- NOT APPLIED to production as part of this task.
--
-- Verification (local only, never production):
--   1. supabase db reset            (or a scratch local database)
--   2. psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 \
--        -f supabase/tests/agent_spending_breakdown_test.sql

begin;

create or replace function public.get_spending_breakdown(
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
  v_start     date;
  v_end       date;
  v_currency  text;
  v_total     numeric := 0;
  v_budget    numeric := 0;
  v_categories json;
begin
  -- NULL uid = server-side caller (service_role / cron): allowed.
  -- Non-NULL uid must match the requested user (owner verification).
  if auth.uid() is not null and auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized';
  end if;

  if p_year is null or p_year < 2000 or p_year > 2100 then
    raise exception 'Invalid year: %', p_year;
  end if;
  if p_month is null or p_month < 1 or p_month > 12 then
    raise exception 'Invalid month: %', p_month;
  end if;

  -- Half-open range keeps `idx_transactions_user_date` usable.
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
    -- FULL OUTER JOIN: keep budgeted categories with no spend, and spend in
    -- categories that have no budget row.
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

comment on function public.get_spending_breakdown(uuid, int, int) is
  'Agent tool backing RPC: monthly expenses grouped by category with budget limit/remaining/pct used. Base-currency amounts; excludes soft-deleted transactions.';

-- Hardening convention (20261018): no PUBLIC/anon execution.
revoke execute on function public.get_spending_breakdown(uuid, int, int) from public, anon;
grant execute on function public.get_spending_breakdown(uuid, int, int)
  to authenticated, service_role;

commit;
