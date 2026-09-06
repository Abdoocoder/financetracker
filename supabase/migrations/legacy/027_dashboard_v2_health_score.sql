-- =============================================
-- 027_dashboard_v2_health_score.sql
-- تحديث لوحة المعلومات لتشمل الصدة المالية المحسوبة مركزياً
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
  v_total_owed numeric;
  v_total_receivable numeric;
  v_investment_cash_usd numeric;
  v_net_worth numeric;
  v_health_score integer;
BEGIN
  -- 1. مجموع أرصدة الحسابات التابعة للمستخدم
  SELECT coalesce(sum(current_balance), 0)
  INTO v_total_accounts
  FROM public.get_account_balances(p_user_id);

  -- 2. قيمة الاستثمارات (الأسهم والعملات الرقمية مضروبة في سعرها الحالي)
  SELECT coalesce(sum(shares * current_price), 0)
  INTO v_investments_usd
  FROM public.investments
  WHERE user_id = p_user_id;

  v_investments_local := v_investments_usd * p_usd_to_local_rate;

  -- 3. الكاش الموجود في حسابات الاستثمار
  SELECT coalesce(sum(balance), 0)
  INTO v_investment_cash_usd
  FROM public.investment_cash
  WHERE user_id = p_user_id;

  -- 4. مدخرات الأهداف
  SELECT coalesce(sum(current_amount), 0)
  INTO v_goals_saved
  FROM public.savings_goals
  WHERE user_id = p_user_id;

  -- 5. الديون (مطلوبة ومحلية)
  SELECT
    coalesce(sum(CASE WHEN debt_type = 'owed' THEN remaining_amount ELSE 0 END), 0),
    coalesce(sum(CASE WHEN debt_type = 'receivable' THEN remaining_amount ELSE 0 END), 0)
  INTO v_total_owed, v_total_receivable
  FROM public.debts
  WHERE user_id = p_user_id AND is_paid = false;

  -- 6. حساب صافي الثروة النهائي
  v_net_worth := v_total_accounts + v_investments_local + (v_investment_cash_usd * p_usd_to_local_rate) + v_goals_saved + v_total_receivable - v_total_owed;

  -- 7. جلب درجة الصحة المالية المركزية
  v_health_score := public.calculate_health_score(p_user_id, p_usd_to_local_rate);

  RETURN json_build_object(
    'net_worth', v_net_worth,
    'total_accounts_balance', v_total_accounts,
    'investments_value_local', v_investments_local,
    'investments_value_usd', v_investments_usd,
    'investment_cash_local', v_investment_cash_usd * p_usd_to_local_rate,
    'goals_saved', v_goals_saved,
    'total_debt_owed', v_total_owed,
    'total_receivable', v_total_receivable,
    'health_score', v_health_score
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
