-- =============================================
-- 035_dashboard_rpc_consolidate.sql
-- إضافة unread_alerts و goals_target و monthly_debt_commitments
-- إلى RPC لوحة المعلومات للتخلص من 3 طلبات منفصلة
-- =============================================

DROP FUNCTION IF EXISTS public.get_financial_dashboard(uuid, double precision);

CREATE FUNCTION public.get_financial_dashboard(
  p_user_id uuid,
  p_usd_to_local_rate double precision DEFAULT 1.0
)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT json_build_object(
    'net_worth',
      coalesce((SELECT sum(t.current_balance) FROM public.get_account_balances(p_user_id) AS t), 0)
      + coalesce((SELECT sum(shares * current_price) FROM public.investments WHERE user_id = p_user_id), 0) * p_usd_to_local_rate
      + coalesce((SELECT sum(balance) FROM public.investment_cash WHERE user_id = p_user_id), 0) * p_usd_to_local_rate
      + coalesce((SELECT sum(current_amount) FROM public.savings_goals WHERE user_id = p_user_id), 0)
      + coalesce((SELECT sum(remaining_amount) FROM public.debts WHERE user_id = p_user_id AND is_paid = false AND debt_type = 'receivable'), 0)
      - coalesce((SELECT sum(remaining_amount) FROM public.debts WHERE user_id = p_user_id AND is_paid = false AND debt_type = 'owed'), 0),

    'total_accounts_balance',
      coalesce((SELECT sum(t.current_balance) FROM public.get_account_balances(p_user_id) AS t), 0),

    'investments_value_usd',
      coalesce((SELECT sum(shares * current_price) FROM public.investments WHERE user_id = p_user_id), 0),

    'investments_value_local',
      coalesce((SELECT sum(shares * current_price) FROM public.investments WHERE user_id = p_user_id), 0) * p_usd_to_local_rate,

    'investment_cash_local',
      coalesce((SELECT sum(balance) FROM public.investment_cash WHERE user_id = p_user_id), 0) * p_usd_to_local_rate,

    'goals_saved',
      coalesce((SELECT sum(current_amount) FROM public.savings_goals WHERE user_id = p_user_id), 0),

    'goals_target',
      coalesce((SELECT sum(target_amount) FROM public.savings_goals WHERE user_id = p_user_id), 0),

    'total_debt_owed',
      coalesce((SELECT sum(remaining_amount) FROM public.debts WHERE user_id = p_user_id AND is_paid = false AND debt_type = 'owed'), 0),

    'total_receivable',
      coalesce((SELECT sum(remaining_amount) FROM public.debts WHERE user_id = p_user_id AND is_paid = false AND debt_type = 'receivable'), 0),

    'monthly_debt_commitments',
      coalesce((SELECT sum(monthly_payment) FROM public.debts WHERE user_id = p_user_id AND is_paid = false AND auto_deduct = true AND debt_type = 'owed'), 0),

    'unread_alerts',
      coalesce((SELECT count(*)::integer FROM public.alerts WHERE user_id = p_user_id AND is_read = false), 0),

    'health_score',
      public.calculate_health_score(p_user_id::uuid, p_usd_to_local_rate::double precision)
  )
$function$;
