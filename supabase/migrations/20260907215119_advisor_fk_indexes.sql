-- =============================================
-- 049_advisor_fk_indexes.sql
-- Closes the three unindexed-FK gaps flagged by the Supabase
-- database advisor (schema-foreign-key-indexes):
--
--   1. budget_alert_log(user_id)            → user_id FK unindexed
--   2. transactions(transfer_to_account_id) → transfer FK unindexed
--   3. user_api_keys(user_id)               → user_id FK unindexed
--
-- Index 2 uses the SAME name and definition as migration 048
-- (idx_transactions_transfer_to_account, partial WHERE transfer FK
-- IS NOT NULL). If 048 is applied to this project later, its own
-- CREATE INDEX IF NOT EXISTS becomes a no-op — no duplicate index.
--
-- All columns exist in the archived legacy migrations, so these
-- build cleanly on a fresh migrations-applied database.
-- Every index is idempotent (IF NOT EXISTS) — safe to re-run.
-- =============================================

-- =============================================
-- 1. BUDGET_ALERT_LOG — (user_id)
--    trg_check_budget_limits (023) issues
--      WHERE user_id = ? AND budget_id = ? AND alert_month = ? ...
--    per alert write; index scan instead of a full-table filter.
-- =============================================
CREATE INDEX IF NOT EXISTS idx_budget_alert_log_user_id
  ON public.budget_alert_log(user_id);

-- =============================================
-- 2. TRANSACTIONS — partial (transfer_to_account_id)
--    Transfer destination lookups (dashboard balance aggregation,
--    transfer rollback) filter on this FK. Partial index only
--    covers rows where a transfer actually targets another account.
--    Named identically to 048 so applying both is a no-op, never
--    a duplicate index.
-- =============================================
CREATE INDEX IF NOT EXISTS idx_transactions_transfer_to_account
  ON public.transactions(transfer_to_account_id)
  WHERE transfer_to_account_id IS NOT NULL;

-- =============================================
-- 3. USER_API_KEYS — (user_id)
--    BYOK key listing/revocation (app/api/byok) filters per user:
--      WHERE user_id = ? AND is_active = true
--    user_id had no index; only the partial (key_hash) look-uk index
--    and the PK existed.
-- =============================================
CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id
  ON public.user_api_keys(user_id);