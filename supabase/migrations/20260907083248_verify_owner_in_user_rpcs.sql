-- 046_verify_owner_in_user_rpcs.sql
-- Defense-in-depth: SECURITY DEFINER RPCs must only operate on the caller's own data.
-- Guard: when a user JWT is present (auth.uid() IS NOT NULL) and differs from the
-- requested user id, the call is rejected. service_role calls (auth.uid() IS NULL,
-- e.g. /api/webhook and /api/mcp via createAdminClient) are unaffected because they
-- already authenticated with an API key bound to a specific user id.
--
-- This closes the remaining authenticated-secdef linter class end-to-end:
-- anon revoked (044/045) + PUBLIC revoked (045) + in-function owner check (046).

-- ── get_account_balances ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_account_balances(p_user_id uuid)
 RETURNS TABLE(account_id uuid, account_name text, current_balance numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  WITH tx_summary AS (
    SELECT
      a.id AS acc_id,
      COALESCE(SUM(CASE WHEN t.type = 'income'  THEN t.amount ELSE 0 END), 0) AS income,
      COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS expense,
      COALESCE(SUM(CASE WHEN t.type = 'transfer' AND t.transfer_to_account_id = a.id THEN t.amount ELSE 0 END), 0) AS xfer_in,
      COALESCE(SUM(CASE WHEN t.type = 'transfer' AND t.account_id = a.id            THEN t.amount ELSE 0 END), 0) AS xfer_out
    FROM public.accounts a
    LEFT JOIN public.transactions t
      ON (t.account_id = a.id OR t.transfer_to_account_id = a.id)
      AND t.deleted_at IS NULL
    WHERE a.user_id = p_user_id AND a.is_archived = false AND a.deleted_at IS NULL
    GROUP BY a.id
  )
  SELECT
    a.id,
    a.name,
    (a.opening_balance + s.income - s.expense + s.xfer_in - s.xfer_out)::numeric AS current_balance
  FROM public.accounts a
  JOIN tx_summary s ON s.acc_id = a.id
  WHERE a.user_id = p_user_id AND a.is_archived = false AND a.deleted_at IS NULL;
END;
$function$;

-- ── get_financial_dashboard ───────────────────────────────────────────
-- Converted from LANGUAGE sql to plpgsql to host the owner guard.
CREATE OR REPLACE FUNCTION public.get_financial_dashboard(p_user_id uuid, p_usd_to_local_rate double precision DEFAULT 1.0)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN (
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

      'health_score', 0
    )
  );
END;
$function$;

-- ── get_monthly_financial_summary ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_monthly_financial_summary(p_user_id uuid, p_year integer DEFAULT NULL::integer, p_month integer DEFAULT NULL::integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_year int := coalesce(p_year, extract(year from now())::int);
  v_month int := coalesce(p_month, extract(month from now())::int);
  v_income numeric := 0;
  v_expenses numeric := 0;
  v_debt_payments numeric := 0;
  v_net numeric := 0;
begin
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
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
$function$;

-- ── get_zakat_summary ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_zakat_summary(p_user_id uuid, p_gold_price_per_gram double precision, p_silver_price_per_gram double precision, p_usd_to_local_rate double precision DEFAULT 1.0)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_dash json;
  v_nisab_gold numeric;
  v_nisab_silver numeric;
  v_nisab_effective numeric;
  v_zakatable_assets numeric;
  v_zakat_due numeric;
  v_is_eligible boolean;
begin
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  -- جلب بيانات لوحة المعلومات (أصول المستخدم)
  v_dash := public.get_financial_dashboard(p_user_id, p_usd_to_local_rate);

  -- حساب النصاب (الذهب 85ج، الفضة 595ج)
  v_nisab_gold := 85 * p_gold_price_per_gram;
  v_nisab_silver := 595 * p_silver_price_per_gram;

  -- الممارسة الفضلى (الأقل منهما لصالح الفقير - غالباً الفضة حالياً)
  v_nisab_effective := least(v_nisab_gold, v_nisab_silver);

  -- الوعاء الزكوي = (النقد + المدخرات + الاستثمارات) - الديون التي تنقص الوعاء
  v_zakatable_assets := (v_dash->>'total_accounts_balance')::numeric
                      + (v_dash->>'investments_value_local')::numeric
                      + (v_dash->>'investment_cash_local')::numeric
                      + (v_dash->>'goals_saved')::numeric
                      - (v_dash->>'total_debt_owed')::numeric;

  -- شرط بلوغ النصاب
  if v_zakatable_assets >= v_nisab_effective then
    v_is_eligible := true;
    v_zakat_due := v_zakatable_assets * 0.025; -- نسبة 2.5% للسنة القمرية
  else
    v_is_eligible := false;
    v_zakat_due := 0;
  end if;

  return json_build_object(
    'is_eligible', v_is_eligible,
    'zakat_due', v_zakat_due,
    'zakatable_assets', v_zakatable_assets,
    'nisab_gold', v_nisab_gold,
    'nisab_silver', v_nisab_silver,
    'nisab_effective', v_nisab_effective
  );
end;
$function$;

-- ── delete_user_account ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.delete_user_account(user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  DELETE FROM debt_payments           WHERE debt_payments.user_id = $1;
  DELETE FROM investment_transactions WHERE investment_transactions.user_id = $1;
  DELETE FROM transactions            WHERE transactions.user_id = $1;
  DELETE FROM debts                   WHERE debts.user_id = $1;
  DELETE FROM investments             WHERE investments.user_id = $1;
  DELETE FROM budgets                 WHERE budgets.user_id = $1;
  DELETE FROM savings_goals           WHERE savings_goals.user_id = $1;
  DELETE FROM alerts                  WHERE alerts.user_id = $1;
  DELETE FROM push_subscriptions      WHERE push_subscriptions.user_id = $1;
  DELETE FROM profiles                WHERE profiles.id = $1;
  DELETE FROM auth.users              WHERE id = $1;
END;
$function$;

-- ── upsert_investment_cash ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.upsert_investment_cash(p_user_id uuid, p_currency text, p_amount numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  insert into public.investment_cash (user_id, currency, balance)
  values (p_user_id, p_currency, p_amount)
  on conflict (user_id, currency)
  do update set
    balance = public.investment_cash.balance + p_amount,
    updated_at = now();
end;
$function$;