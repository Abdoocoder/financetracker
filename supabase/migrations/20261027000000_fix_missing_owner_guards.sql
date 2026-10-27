-- Migration: 20261027000000_fix_missing_owner_guards.sql
-- Purpose: Add missing owner-verification guards to 6 SECURITY DEFINER functions
--          flagged by Supabase Security Advisor as authenticated_security_definer_function_executable.
--          This closes the remaining authenticated-secdef linter class end-to-end.

begin;

-- 1. calculate_health_score
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
  -- Owner guard
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_first_day_of_month := date_trunc('month', now())::date;

  SELECT
    COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
  INTO v_income, v_expenses
  FROM public.transactions
  WHERE user_id = p_user_id AND transaction_date >= v_first_day_of_month;

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

  SELECT COALESCE(SUM(current_amount), 0) INTO v_goals_saved
  FROM public.savings_goals WHERE user_id = p_user_id;

  IF v_income > 0 THEN
    v_emergency_ratio := v_goals_saved / (v_income * 3);
    IF v_emergency_ratio >= 1.0 THEN v_score := v_score + 20;
    ELSIF v_emergency_ratio >= 0.5 THEN v_score := v_score + 12;
    ELSIF v_emergency_ratio > 0 THEN v_score := v_score + 6;
    END IF;
  END IF;

  SELECT COALESCE(SUM(shares * current_price), 0) INTO v_inv_value
  FROM public.investments WHERE user_id = p_user_id;

  IF v_inv_value > 0 THEN v_score := v_score + 15; END IF;

  SELECT COUNT(*) INTO v_tx_count
  FROM public.transactions
  WHERE user_id = p_user_id
    AND transaction_date >= (now() - interval '30 days')::date;

  IF v_tx_count >= 10 THEN v_score := v_score + 10;
  ELSIF v_tx_count >= 5 THEN v_score := v_score + 6;
  ELSIF v_tx_count > 0 THEN v_score := v_score + 3;
  END IF;

  RETURN LEAST(v_score, 100);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.calculate_health_score(uuid, double precision) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.calculate_health_score(uuid, double precision) TO authenticated, service_role;

-- 2. get_health_score
CREATE OR REPLACE FUNCTION public.get_health_score(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_score integer;
BEGIN
  -- Owner guard
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT score INTO v_score
  FROM public.health_score_history
  WHERE user_id = p_user_id
  ORDER BY recorded_at DESC
  LIMIT 1;

  RETURN COALESCE(v_score, 0);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_health_score(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_health_score(uuid) TO authenticated, service_role;

-- 3. check_and_reserve_idempotency_key
CREATE OR REPLACE FUNCTION public.check_and_reserve_idempotency_key(
  p_user_id uuid,
  p_key_hash text,
  p_expires_at timestamptz DEFAULT (now() + interval '24 hours')
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_record public.idempotency_keys%rowtype;
BEGIN
  -- Owner guard
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Try to insert the key (atomic check-and-reserve)
  BEGIN
    INSERT INTO public.idempotency_keys (user_id, key_hash, expires_at)
    VALUES (p_user_id, p_key_hash, p_expires_at)
    ON CONFLICT (user_id, key_hash) DO NOTHING
    RETURNING * INTO existing_record;

    IF FOUND THEN
      RETURN jsonb_build_object('status', 'available');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- If insert failed due to race, fall through to select
  END;

  -- Key already exists - check its state
  SELECT * INTO existing_record
  FROM public.idempotency_keys
  WHERE user_id = p_user_id AND key_hash = p_key_hash;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'available');
  END IF;

  IF existing_record.transaction_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'duplicate',
      'transaction_id', existing_record.transaction_id
    );
  ELSE
    RETURN jsonb_build_object('status', 'processing');
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_and_reserve_idempotency_key(uuid, text, timestamptz) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.check_and_reserve_idempotency_key(uuid, text, timestamptz) TO authenticated, service_role;

-- 4. complete_idempotency_key
CREATE OR REPLACE FUNCTION public.complete_idempotency_key(
  p_user_id uuid,
  p_key_hash text,
  p_transaction_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Owner guard
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.idempotency_keys
  SET transaction_id = p_transaction_id
  WHERE user_id = p_user_id AND key_hash = p_key_hash;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.complete_idempotency_key(uuid, text, uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.complete_idempotency_key(uuid, text, uuid) TO authenticated, service_role;

-- 5. get_changed_records
CREATE OR REPLACE FUNCTION public.get_changed_records(
  p_user_id uuid,
  p_table_name text,
  p_since timestamptz,
  p_page_size int DEFAULT 1000,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  data jsonb,
  operation text,
  changed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Owner guard
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY EXECUTE FORMAT(
    'SELECT t.id, to_jsonb(t)::jsonb,
       CASE WHEN t.deleted_at IS NOT NULL THEN ''delete''
            WHEN t.created_at = t.updated_at THEN ''create''
            ELSE ''update'' END,
       COALESCE(t.updated_at, t.created_at)
     FROM public.%I t
     WHERE t.user_id = $1
       AND (t.deleted_at IS NULL OR t.deleted_at > $2)
       AND COALESCE(t.updated_at, t.created_at) > $2
     ORDER BY COALESCE(t.updated_at, t.created_at)
     LIMIT $3 OFFSET $4',
    p_table_name
  ) USING p_user_id, p_since, p_page_size, p_offset;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_changed_records(uuid, text, timestamptz, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_changed_records(uuid, text, timestamptz, int, int) TO authenticated, service_role;

-- 6. get_deleted_records
CREATE OR REPLACE FUNCTION public.get_deleted_records(
  p_user_id uuid,
  p_table_name text,
  p_since timestamptz
)
RETURNS TABLE (id uuid, deleted_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Owner guard
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY EXECUTE FORMAT(
    'SELECT t.id, t.deleted_at
     FROM public.%I t
     WHERE t.user_id = $1
       AND t.deleted_at IS NOT NULL
       AND t.deleted_at > $2',
    p_table_name
  ) USING p_user_id, p_since;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_deleted_records(uuid, text, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_deleted_records(uuid, text, timestamptz) TO authenticated, service_role;

commit;