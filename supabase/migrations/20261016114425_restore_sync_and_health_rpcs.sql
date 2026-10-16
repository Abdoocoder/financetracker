-- =====================================================================
-- Restore 4 missing RPCs (clean, verified)
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. get_changed_records
-- ---------------------------------------------------------------------
create or replace function public.get_changed_records(
  p_user_id uuid,
  p_table_name text,
  p_since timestamptz,
  p_page_size int default 1000,
  p_offset int default 0
)
returns table (
  id uuid,
  data jsonb,
  operation text,
  changed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $function$
begin
  return query execute format(
    'select t.id, to_jsonb(t)::jsonb,
       case when t.deleted_at is not null then ''delete''
            when t.created_at = t.updated_at then ''create''
            else ''update'' end,
       coalesce(t.updated_at, t.created_at)
     from public.%I t
     where t.user_id = $1
       and (t.deleted_at is null or t.deleted_at > $2)
       and coalesce(t.updated_at, t.created_at) > $2
     order by coalesce(t.updated_at, t.created_at)
     limit $3 offset $4',
    p_table_name
  ) using p_user_id, p_since, p_page_size, p_offset;
end;
$function$;

revoke all on function public.get_changed_records(uuid, text, timestamptz, int, int) from public;
grant execute on function public.get_changed_records(uuid, text, timestamptz, int, int) to authenticated;
grant execute on function public.get_changed_records(uuid, text, timestamptz, int, int) to service_role;

-- ---------------------------------------------------------------------
-- 2. get_deleted_records
-- ---------------------------------------------------------------------
create or replace function public.get_deleted_records(
  p_user_id uuid,
  p_table_name text,
  p_since timestamptz
)
returns table (id uuid, deleted_at timestamptz)
language plpgsql
security definer
set search_path = public
as $function$
begin
  return query execute format(
    'select t.id, t.deleted_at
     from public.%I t
     where t.user_id = $1
       and t.deleted_at is not null
       and t.deleted_at > $2',
    p_table_name
  ) using p_user_id, p_since;
end;
$function$;

revoke all on function public.get_deleted_records(uuid, text, timestamptz) from public;
grant execute on function public.get_deleted_records(uuid, text, timestamptz) to authenticated;
grant execute on function public.get_deleted_records(uuid, text, timestamptz) to service_role;

-- ---------------------------------------------------------------------
-- 3. calculate_health_score (from legacy/026)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_health_score(
  p_user_id uuid,
  p_usd_to_local_rate double precision DEFAULT 1.0
)
RETURNS integer AS $function$
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
$function$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

revoke all on function public.calculate_health_score(uuid, double precision) from public;
grant execute on function public.calculate_health_score(uuid, double precision) to authenticated;
grant execute on function public.calculate_health_score(uuid, double precision) to service_role;

-- ---------------------------------------------------------------------
-- 4. get_health_score
-- ---------------------------------------------------------------------
create or replace function public.get_health_score(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_score integer;
begin
  select score into v_score
  from public.health_score_history
  where user_id = p_user_id
  order by recorded_at desc
  limit 1;

  return coalesce(v_score, 0);
end;
$function$;

revoke all on function public.get_health_score(uuid) from public;
grant execute on function public.get_health_score(uuid) to authenticated;
grant execute on function public.get_health_score(uuid) to service_role;
