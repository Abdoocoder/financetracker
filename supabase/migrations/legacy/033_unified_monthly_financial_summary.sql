-- =============================================
-- 033_unified_monthly_financial_summary.sql
-- Centralized monthly financial summary for web/mobile parity
-- =============================================

create or replace function public.get_monthly_financial_summary(
  p_user_id uuid,
  p_year int default null,
  p_month int default null
)
returns json as $$
declare
  v_year int := coalesce(p_year, extract(year from now())::int);
  v_month int := coalesce(p_month, extract(month from now())::int);
  v_income numeric := 0;
  v_expenses numeric := 0;
  v_debt_payments numeric := 0;
  v_net numeric := 0;
begin
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
$$ language plpgsql security definer;

alter function public.get_monthly_financial_summary(uuid, int, int)
  set search_path = public;
