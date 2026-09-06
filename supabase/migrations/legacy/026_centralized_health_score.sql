-- =============================================
-- 026_centralized_health_score.sql
-- المركزية المحاسبية: وظيفة الصدة المالية الموحدة
-- =============================================

CREATE OR REPLACE FUNCTION public.calculate_health_score(
  p_user_id uuid,
  p_usd_to_local_rate double precision DEFAULT 1.0
)
RETURNS integer AS $$
DECLARE
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
BEGIN
  v_first_day_of_month := date_trunc('month', now())::date;

  -- 1. المداخيل والمصاريف للشهر الحالي
  SELECT 
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
  INTO v_income, v_expenses
  FROM public.transactions
  WHERE user_id = p_user_id AND transaction_date >= v_first_day_of_month;

  -- إذا كان الدخل الحالي 0، نستخدم الدخل الشهري من الملف الشخصي كبديل
  IF v_income = 0 THEN
    SELECT COALESCE(monthly_income, 0) INTO v_income
    FROM public.profiles WHERE id = p_user_id;
  END IF;

  -- 2. توفير (Savings Rate) - بحد أقصى 30 نقطة
  IF v_income > 0 THEN
    v_savings_rate := (v_income - v_expenses) / v_income;
    IF v_savings_rate >= 0.2 THEN v_score := v_score + 30;
    ELSIF v_savings_rate >= 0.1 THEN v_score := v_score + 20;
    ELSIF v_savings_rate > 0 THEN v_score := v_score + 10;
    END IF;
  END IF;

  -- 3. المديونية (Debt Ratio) - بحد أقصى 25 نقطة
  SELECT COALESCE(SUM(remaining_amount), 0) INTO v_total_debt
  FROM public.debts WHERE user_id = p_user_id AND is_paid = false AND debt_type = 'owed';

  IF v_income > 0 THEN
    v_debt_ratio := v_total_debt / (v_income * 12);
    IF v_debt_ratio = 0 THEN v_score := v_score + 25;
    ELSIF v_debt_ratio < 0.3 THEN v_score := v_score + 20;
    ELSIF v_debt_ratio < 0.6 THEN v_score := v_score + 10;
    END IF;
  ELSE
    IF v_total_debt = 0 THEN v_score := v_score + 25; END IF;
  END IF;

  -- 4. صندوق الطوارئ (Emergency Fund) - بحد أقصى 20 نقطة
  SELECT COALESCE(SUM(current_amount), 0) INTO v_goals_saved
  FROM public.savings_goals WHERE user_id = p_user_id;

  IF v_income > 0 THEN
    v_emergency_ratio := v_goals_saved / (v_income * 3);
    IF v_emergency_ratio >= 1.0 THEN v_score := v_score + 20;
    ELSIF v_emergency_ratio >= 0.5 THEN v_score := v_score + 12;
    ELSIF v_emergency_ratio > 0 THEN v_score := v_score + 6;
    END IF;
  END IF;

  -- 5. الاستثمارات - بحد أقصى 15 نقطة
  SELECT COALESCE(SUM(shares * current_price), 0) INTO v_inv_value
  FROM public.investments WHERE user_id = p_user_id;

  IF v_inv_value > 0 THEN v_score := v_score + 15; END IF;

  -- 6. النشاط (Transactions Count) - بحد أقصى 10 نقاط
  SELECT COUNT(*) INTO v_tx_count
  FROM public.transactions WHERE user_id = p_user_id AND transaction_date >= (now() - interval '30 days')::date;

  IF v_tx_count >= 10 THEN v_score := v_score + 10;
  ELSIF v_tx_count >= 5 THEN v_score := v_score + 6;
  ELSIF v_tx_count > 0 THEN v_score := v_score + 3;
  END IF;

  RETURN LEAST(v_score, 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
