-- =============================================
-- 035_dashboard_rpc_consolidate.sql
-- إضافة unread_alerts و goals_target و monthly_debt_commitments
-- إلى RPC لوحة المعلومات للتخلص من 3 طلبات منفصلة
-- =============================================

CREATE OR REPLACE FUNCTION public.get_financial_dashboard(
  p_user_id uuid,
  p_usd_to_local_rate double precision DEFAULT 1.0
)
RETURNS json AS $$
DECLARE
  v_total_accounts numeric;
  v_investments_usd numeric;
  v_investments_local numeric;
  v_goals_saved numeric;
  v_goals_target numeric;
  v_total_owed numeric;
  v_total_receivable numeric;
  v_investment_cash_usd numeric;
  v_net_worth numeric;
  v_health_score integer;
  v_unread_alerts integer;
  v_monthly_debt_commitments numeric;
BEGIN
  -- 1. مجموع أرصدة الحسابات
  SELECT coalesce(sum(current_balance), 0)
  INTO v_total_accounts
  FROM public.get_account_balances(p_user_id);

  -- 2. قيمة الاستثمارات
  SELECT coalesce(sum(shares * current_price), 0)
  INTO v_investments_usd
  FROM public.investments
  WHERE user_id = p_user_id;

  v_investments_local := v_investments_usd * p_usd_to_local_rate;

  -- 3. كاش حسابات الاستثمار
  SELECT coalesce(sum(balance), 0)
  INTO v_investment_cash_usd
  FROM public.investment_cash
  WHERE user_id = p_user_id;

  -- 4. مدخرات الأهداف + إجمالي الهدف
  SELECT
    coalesce(sum(current_amount), 0),
    coalesce(sum(target_amount), 0)
  INTO v_goals_saved, v_goals_target
  FROM public.savings_goals
  WHERE user_id = p_user_id;

  -- 5. الديون
  SELECT
    coalesce(sum(CASE WHEN debt_type = 'owed' THEN remaining_amount ELSE 0 END), 0),
    coalesce(sum(CASE WHEN debt_type = 'receivable' THEN remaining_amount ELSE 0 END), 0)
  INTO v_total_owed, v_total_receivable
  FROM public.debts
  WHERE user_id = p_user_id AND is_paid = false;

  -- 6. الالتزامات الشهرية للديون (auto_deduct فقط)
  SELECT coalesce(sum(monthly_payment), 0)
  INTO v_monthly_debt_commitments
  FROM public.debts
  WHERE user_id = p_user_id
    AND is_paid = false
    AND auto_deduct = true
    AND debt_type = 'owed';

  -- 7. صافي الثروة
  v_net_worth := v_total_accounts
    + v_investments_local
    + (v_investment_cash_usd * p_usd_to_local_rate)
    + v_goals_saved
    + v_total_receivable
    - v_total_owed;

  -- 8. درجة الصحة المالية
  v_health_score := public.calculate_health_score(p_user_id, p_usd_to_local_rate);

  -- 9. التنبيهات غير المقروءة
  SELECT coalesce(count(*)::integer, 0)
  INTO v_unread_alerts
  FROM public.alerts
  WHERE user_id = p_user_id AND is_read = false;

  RETURN json_build_object(
    'net_worth',                  v_net_worth,
    'total_accounts_balance',     v_total_accounts,
    'investments_value_local',    v_investments_local,
    'investments_value_usd',      v_investments_usd,
    'investment_cash_local',      v_investment_cash_usd * p_usd_to_local_rate,
    'goals_saved',                v_goals_saved,
    'goals_target',               v_goals_target,
    'total_debt_owed',            v_total_owed,
    'total_receivable',           v_total_receivable,
    'monthly_debt_commitments',   v_monthly_debt_commitments,
    'unread_alerts',              v_unread_alerts,
    'health_score',               v_health_score
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
