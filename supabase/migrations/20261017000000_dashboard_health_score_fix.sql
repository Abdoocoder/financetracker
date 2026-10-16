-- Fix: get_financial_dashboard returned hardcoded 'health_score', 0
-- Now reads from get_health_score RPC which reads health_score_history.

create or replace function public.get_financial_dashboard(
  p_user_id uuid,
  p_usd_to_local_rate double precision default 1.0
)
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
    with ab as (
      select * from public.get_account_balances(p_user_id)
    )
    select json_build_object(
      'net_worth',
        coalesce((select sum(current_balance) from ab), 0)
        + coalesce((select sum(shares * current_price) from public.investments where user_id = p_user_id), 0) * p_usd_to_local_rate
        + coalesce((select sum(balance) from public.investment_cash where user_id = p_user_id), 0) * p_usd_to_local_rate
        + coalesce((select sum(current_amount) from public.savings_goals where user_id = p_user_id), 0)
        + coalesce((select sum(remaining_amount) from public.debts where user_id = p_user_id and is_paid = false and debt_type = 'receivable'), 0)
        - coalesce((select sum(remaining_amount) from public.debts where user_id = p_user_id and is_paid = false and debt_type = 'owed'), 0),
      'total_accounts_balance',
        coalesce((select sum(current_balance) from ab), 0),
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
      'health_score',
        coalesce(public.get_health_score(p_user_id), 0)
    )
  );
end;
$function$;
