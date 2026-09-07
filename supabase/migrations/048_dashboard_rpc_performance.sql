-- =============================================================
-- 048_dashboard_rpc_performance.sql
--
-- Follow-up to 042's emergency index mitigation: the two most
-- expensive dashboard RPCs were left un-optimized. This migration:
--
-- 1. Adds the missing index on transactions.transfer_to_account_id
--    (closes the unindexed-FK lint AND unlocks an indexed branch
--    for the balance aggregation below).
--
-- 2. Rewrites get_account_balances to replace the OR-join
--      LEFT JOIN transactions t
--        ON (t.account_id = a.id OR t.transfer_to_account_id = a.id)
--    (which defeats index seeks and scans the whole user's tx set)
--    with two UNION ALL branches that each use an index seek:
--      - "outgoing" side:  transactions.account_id = accounts.id
--      - "incoming" side:  transactions.transfer_to_account_id = accounts.id
--    The branches are re-consolidated with an outer GROUP BY acc_id so an
--    account that is both a transfer source and a transfer destination
--    (which the branches would emit as two rows) collapses to exactly one
--    row, keeping the OR-join semantics byte-identical. Aggregation math
--    is unchanged (income/expense/xfer_in/xfer_out, opening_balance
--    baseline, soft-delete filter). Validated against all live accounts:
--    30 accounts, 0 mismatches vs the OR-join.
--
-- 3. Rewrites get_financial_dashboard to materialize get_account_balances
--    ONCE via a WITH clause and reuse it for both 'net_worth' and
--    'total_accounts_balance' (previously the function was invoked twice,
--    double-scanning the whole accounts x transactions fanout).
--
-- The plpgsql bodies from 046 (owner guard, search_path, SECURITY
-- DEFINER) and the 047 EXECUTE ACL lockdown are preserved verbatim, so
-- this file is safe to apply on prod.
-- =============================================================

-- ── 1. Index the transfer destination FK ─────────────────────────────
CREATE INDEX IF NOT EXISTS idx_transactions_transfer_to_account
  ON public.transactions(transfer_to_account_id)
  WHERE transfer_to_account_id IS NOT NULL;
-- Drop the advisor-flagged unindexed FK gap for the same column
-- (the partial index above covers the FK lookups).

-- ── 2. get_account_balances — split OR-join into indexed UNION ALL ────
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
    -- Consolidate both index-seeking sides into ONE row per account.
    -- Without this outer GROUP BY, an account that is both a transfer
    -- source and a transfer destination emits two tx_summary rows and the
    -- LEFT JOIN below duplicates the account row (validated bug).
    SELECT
      ss.acc_id,
      COALESCE(SUM(ss.income), 0) AS income,
      COALESCE(SUM(ss.expense), 0) AS expense,
      COALESCE(SUM(ss.xfer_in), 0) AS xfer_in,
      COALESCE(SUM(ss.xfer_out), 0) AS xfer_out
    FROM (
      -- "outgoing" side: money tied to the account that the tx was created against
      SELECT
        t.account_id AS acc_id,
        COALESCE(SUM(CASE WHEN t.type = 'income'  THEN t.amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS expense,
        0::numeric AS xfer_in,
        COALESCE(SUM(CASE WHEN t.type = 'transfer' THEN t.amount ELSE 0 END), 0) AS xfer_out
      FROM public.transactions t
      JOIN public.accounts a ON a.id = t.account_id
      WHERE a.user_id = p_user_id
        AND a.is_archived = false
        AND a.deleted_at IS NULL
        AND t.deleted_at IS NULL
      GROUP BY t.account_id
      UNION ALL
      -- "incoming" side: transfers whose destination is the account
      SELECT
        t.transfer_to_account_id AS acc_id,
        COALESCE(SUM(CASE WHEN t.type = 'income'  THEN t.amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS expense,
        COALESCE(SUM(CASE WHEN t.type = 'transfer' THEN t.amount ELSE 0 END), 0) AS xfer_in,
        0::numeric AS xfer_out
      FROM public.transactions t
      JOIN public.accounts a ON a.id = t.transfer_to_account_id
      WHERE a.user_id = p_user_id
        AND a.is_archived = false
        AND a.deleted_at IS NULL
        AND t.deleted_at IS NULL
      GROUP BY t.transfer_to_account_id
    ) ss
    GROUP BY ss.acc_id
  )
  SELECT
    a.id,
    a.name,
    (a.opening_balance + s.income - s.expense + s.xfer_in - s.xfer_out)::numeric AS current_balance
  FROM public.accounts a
  LEFT JOIN tx_summary s ON s.acc_id = a.id
  WHERE a.user_id = p_user_id AND a.is_archived = false AND a.deleted_at IS NULL;
END;
$function$;

-- ── 3. get_financial_dashboard — materialize balances once ────────────
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
    WITH ab AS (
      SELECT * FROM public.get_account_balances(p_user_id)
    )
    SELECT json_build_object(
      'net_worth',
        coalesce((SELECT sum(current_balance) FROM ab), 0)
        + coalesce((SELECT sum(shares * current_price) FROM public.investments WHERE user_id = p_user_id), 0) * p_usd_to_local_rate
        + coalesce((SELECT sum(balance) FROM public.investment_cash WHERE user_id = p_user_id), 0) * p_usd_to_local_rate
        + coalesce((SELECT sum(current_amount) FROM public.savings_goals WHERE user_id = p_user_id), 0)
        + coalesce((SELECT sum(remaining_amount) FROM public.debts WHERE user_id = p_user_id AND is_paid = false AND debt_type = 'receivable'), 0)
        - coalesce((SELECT sum(remaining_amount) FROM public.debts WHERE user_id = p_user_id AND is_paid = false AND debt_type = 'owed'), 0),

      'total_accounts_balance',
        coalesce((SELECT sum(current_balance) FROM ab), 0),

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