-- =============================================
-- 038_ensure_deleted_at_columns.sql
-- Guarantees deleted_at columns exist before get_account_balances uses them.
-- Migration 037 was applied to some environments before 034, leaving the
-- function referencing a non-existent column. This migration is idempotent.
-- =============================================

ALTER TABLE public.transactions        ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.accounts            ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.debts               ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.investments         ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.budgets             ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.savings_goals       ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Re-create the function now that the column is guaranteed to exist.
CREATE OR REPLACE FUNCTION public.get_account_balances(p_user_id uuid)
RETURNS TABLE (
  account_id uuid,
  account_name text,
  current_balance numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
$$;
