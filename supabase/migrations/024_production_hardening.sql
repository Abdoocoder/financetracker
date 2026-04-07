-- =============================================
-- 024_production_hardening.sql
-- Performance & Security hardening for production
-- =============================================

-- =============================================
-- 1. COMPOUND INDEXES FOR TRANSACTIONS
--    The dashboard runs 2-3 queries per user on this table.
--    A compound index on (user_id, transaction_date DESC, type) lets
--    PostgreSQL satisfy both the WHERE user_id = ? and
--    ORDER BY transaction_date filters with a single index scan.
-- =============================================

CREATE INDEX IF NOT EXISTS idx_transactions_user_date_type
  ON public.transactions(user_id, transaction_date DESC, type);

-- For the chart queries that scan a date range (6-month window)
CREATE INDEX IF NOT EXISTS idx_transactions_user_date
  ON public.transactions(user_id, transaction_date DESC);

-- For the recent-transactions query (ordered by created_at)
CREATE INDEX IF NOT EXISTS idx_transactions_user_created
  ON public.transactions(user_id, created_at DESC);

-- =============================================
-- 2. COMPOUND INDEX FOR DEBTS
--    Dashboard filters: user_id + is_paid = false
--    The partial index already exists (001_initial → 003_add_indexes),
--    but add a compound for queries that also filter debt_type / auto_deduct.
-- =============================================

CREATE INDEX IF NOT EXISTS idx_debts_user_unpaid_type
  ON public.debts(user_id, debt_type)
  WHERE is_paid = false;

-- =============================================
-- 3. COMPOUND INDEX FOR ALERTS
--    Dashboard counts unread alerts: user_id + is_read = false
-- =============================================

CREATE INDEX IF NOT EXISTS idx_alerts_user_unread
  ON public.alerts(user_id)
  WHERE is_read = false;

-- =============================================
-- 4. PUSH SUBSCRIPTIONS INDEX
--    Notification dispatch looks up subscriptions by user_id frequently.
-- =============================================

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id
  ON public.push_subscriptions(user_id);

-- =============================================
-- 5. ACCOUNTS TABLE — upgrade RLS policy to use
--    (select auth.uid()) for per-policy evaluation instead of
--    per-row evaluation (matches the pattern in 010_fix_rls_performance.sql)
-- =============================================

DROP POLICY IF EXISTS "users_own_accounts" ON public.accounts;

CREATE POLICY "users_own_accounts" ON public.accounts
  FOR ALL USING ((select auth.uid()) = user_id);

-- =============================================
-- 6. EXCHANGE RATE VALIDATION
--    Ensure exchange_rate on debts is always > 0 if set.
-- =============================================

DO $$
BEGIN
  ALTER TABLE public.debts
    ADD CONSTRAINT debts_exchange_rate_positive
    CHECK (exchange_rate IS NULL OR exchange_rate > 0);
EXCEPTION WHEN duplicate_object THEN
  NULL; -- constraint already exists, skip
END;
$$;

-- =============================================
-- 7. HEALTH SCORE HISTORY — ensure updated RLS pattern
--    (already done in 010 but duplicated here as guard)
-- =============================================

DROP POLICY IF EXISTS "users manage own scores" ON public.health_score_history;

CREATE POLICY "users manage own scores" ON public.health_score_history
  FOR ALL USING ((select auth.uid()) = user_id);
