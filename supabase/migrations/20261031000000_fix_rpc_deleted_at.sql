-- Migration: 20261031000000_fix_rpc_deleted_at.sql
-- Purpose: Bug 2 — calculate_health_score counted soft-deleted rows.
--
-- Why: transactions / debts / savings_goals / investments use soft deletes
-- (legacy/034_soft_delete_columns.sql, legacy/038_ensure_deleted_at_columns.sql).
-- The RPC summed every row for the user, so a deleted expense still dragged the
-- savings rate down, a deleted debt still counted against the debt ratio, a
-- deleted goal still counted as emergency savings, and a deleted investment still
-- awarded the 15-point investment bonus. Reported in
-- app/api/health-score-snapshot/route.ts (TODO at the RPC call site).
--
-- Signature note: this REPLACES the two-argument function last defined in
-- 20261027000000_fix_missing_owner_guards.sql. The live signature is
-- (uuid, double precision) — get_financial_dashboard() and the health-score
-- snapshot cron both call it. Creating a one-argument overload instead would
-- have shadowed the hardened version for the cron (single-arg calls prefer the
-- no-default candidate) while leaving get_financial_dashboard on the unfixed
-- one, producing two different scores for the same user.
--
-- The owner guard from 20261027000000 is preserved. The score math, thresholds
-- and point values are byte-for-byte the same as before; the only changes are
-- the `AND deleted_at IS NULL` filters.

begin;

CREATE OR REPLACE FUNCTION public.calculate_health_score(
  p_user_id uuid,
  p_usd_to_local_rate double precision DEFAULT 1.0
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
  -- Owner guard (from 20261027000000)
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_first_day_of_month := date_trunc('month', now())::date;

  SELECT
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
  INTO v_income, v_expenses
  FROM public.transactions
  WHERE user_id = p_user_id
    AND transaction_date >= v_first_day_of_month
    AND deleted_at IS NULL;

  IF v_income = 0 THEN
    SELECT COALESCE(monthly_income, 0) INTO v_income
    FROM public.profiles WHERE id = p_user_id;
  END IF;

  IF v_income > 0 THEN
    v_savings_rate := (v_income - v_expenses) / v_income;
    IF v_savings_rate >= 0.2 THEN v_score := v_score + 30;
    ELSIF v_savings_rate >= 0.1 THEN v_score := v_score + 20;
    ELSIF v_savings_rate > 0 THEN v_score := v_score + 10;
    END IF;
  END IF;

  SELECT COALESCE(SUM(remaining_amount), 0) INTO v_total_debt
  FROM public.debts
  WHERE user_id = p_user_id
    AND is_paid = false
    AND debt_type = 'owed'
    AND deleted_at IS NULL;

  IF v_income > 0 THEN
    v_debt_ratio := v_total_debt / (v_income * 12);
    IF v_debt_ratio = 0 THEN v_score := v_score + 25;
    ELSIF v_debt_ratio < 0.3 THEN v_score := v_score + 20;
    ELSIF v_debt_ratio < 0.6 THEN v_score := v_score + 10;
    END IF;
  ELSE
    IF v_total_debt = 0 THEN v_score := v_score + 25; END IF;
  END IF;

  SELECT COALESCE(SUM(current_amount), 0) INTO v_goals_saved
  FROM public.savings_goals
  WHERE user_id = p_user_id
    AND deleted_at IS NULL;

  IF v_income > 0 THEN
    v_emergency_ratio := v_goals_saved / (v_income * 3);
    IF v_emergency_ratio >= 1.0 THEN v_score := v_score + 20;
    ELSIF v_emergency_ratio >= 0.5 THEN v_score := v_score + 12;
    ELSIF v_emergency_ratio > 0 THEN v_score := v_score + 6;
    END IF;
  END IF;

  SELECT COALESCE(SUM(shares * current_price), 0) INTO v_inv_value
  FROM public.investments
  WHERE user_id = p_user_id
    AND deleted_at IS NULL;

  IF v_inv_value > 0 THEN v_score := v_score + 15; END IF;

  SELECT COUNT(*) INTO v_tx_count
  FROM public.transactions
  WHERE user_id = p_user_id
    AND transaction_date >= (now() - interval '30 days')::date
    AND deleted_at IS NULL;

  IF v_tx_count >= 10 THEN v_score := v_score + 10;
  ELSIF v_tx_count >= 5 THEN v_score := v_score + 6;
  ELSIF v_tx_count > 0 THEN v_score := v_score + 3;
  END IF;

  RETURN LEAST(v_score, 100);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.calculate_health_score(uuid, double precision) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.calculate_health_score(uuid, double precision) TO authenticated, service_role;

commit;
