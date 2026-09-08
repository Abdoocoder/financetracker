-- =============================================================
-- 050_fix_get_account_balances_txless_coalesce.sql
--
-- Regression fix for 048's get_account_balances rewrite.
--
-- 048 split the OR-join into two index-seeking UNION ALL branches
-- and re-consolidated them with an outer GROUP BY. Because the
-- branches are both transaction-anchored, an account with ZERO
-- transactions produces NO tx_summary row, and the outer
--   LEFT JOIN tx_summary s ON s.acc_id = a.id
-- leaves s.income/s.expense/s.xfer_in/s.xfer_out = NULL, making
--   current_balance = (opening_balance + NULL - ... ) ::numeric = NULL.
--
-- Before 048 (046 body) the tx_summary CTE was accounts-anchored
-- with COALESCE(SUM(...), 0), so transaction-less accounts returned
-- current_balance = opening_balance. This migration restores that
-- (validated against all live accounts: 6 tx-less accounts showed
-- NULL vs the old 0.00).
--
-- Fix: COALESCE each aggregated column in the FINAL SELECT. This
-- is intentionally per-column — a whole-expression
-- COALESCE(expr, 0) would incorrectly zero out a tx-less account
-- whose opening_balance is non-zero. The internal COALESCEs inside
-- tx_summary do not help because no row exists at all for a
-- transaction-less account.
--
-- Only get_account_balances is recreated; get_financial_dashboard
-- calls it dynamically and inherits the fix (its SUM(current_balance)
-- skips NULLs, so no other change is required).
-- =============================================================

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
    -- per-column COALESCE: restores opening_balance for accounts with
    -- ZERO transactions (048 regression) without masking a non-zero
    -- opening_balance via a whole-expression COALESCE
    (a.opening_balance
      + COALESCE(s.income, 0)
      - COALESCE(s.expense, 0)
      + COALESCE(s.xfer_in, 0)
      - COALESCE(s.xfer_out, 0))::numeric AS current_balance
  FROM public.accounts a
  LEFT JOIN tx_summary s ON s.acc_id = a.id
  WHERE a.user_id = p_user_id AND a.is_archived = false AND a.deleted_at IS NULL;
END;
$function$;