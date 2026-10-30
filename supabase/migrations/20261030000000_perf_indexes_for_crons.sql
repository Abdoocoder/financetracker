-- Performance indexes for the cron + push paths.
--
-- Why: the Supabase project runs on the Free (Nano) tier. Every table read is
-- gated by an RLS policy of the form `auth.uid() = user_id`, and several cron
-- routes filter by `user_id` only. Where no index leads with `user_id`, Postgres
-- falls back to a sequential scan on every request.
--
-- Verified against the production schema on 2026-10-30 (pg_indexes on the
-- restore clone of project ujwcvtpwsaidljecqbaa). `transactions` is deliberately
-- absent: it already has idx_transactions_user_date (user_id, transaction_date
-- DESC), idx_transactions_user_date_type, idx_transactions_user_cat_date and
-- idx_transactions_user_created, which cover every query in this repo.
--
-- CONCURRENTLY is intentionally NOT used: the Supabase CLI runs each migration
-- inside a transaction, and CREATE INDEX CONCURRENTLY cannot run in one. The
-- tables below hold <6k rows each, so the brief SHARE lock is safe.

-- health-score-snapshot: WHERE user_id IN (...) AND is_paid = false
-- debts page:           WHERE user_id = ?
CREATE INDEX IF NOT EXISTS idx_debts_user_paid
  ON public.debts (user_id, is_paid);

-- health-score-snapshot + goals page: WHERE user_id = ?
CREATE INDEX IF NOT EXISTS idx_savings_goals_user
  ON public.savings_goals (user_id);

-- health-score-snapshot + investments page: WHERE user_id = ?
CREATE INDEX IF NOT EXISTS idx_investments_user
  ON public.investments (user_id);

-- budget-alerts cron: WHERE month = ? AND year = ?  (all users)
-- The existing unique index leads with user_id, so it cannot serve this scan.
CREATE INDEX IF NOT EXISTS idx_budgets_year_month
  ON public.budgets (year, month);

-- accounts page: WHERE user_id = ?  (idx_accounts_default is partial and only
-- covers is_default = true)
CREATE INDEX IF NOT EXISTS idx_accounts_user
  ON public.accounts (user_id);

-- auto-recurring cron: WHERE user_id = ? AND is_active = true
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_user_active
  ON public.recurring_transactions (user_id, is_active);

-- lib/push-send.ts dedupe pre-check: WHERE fingerprint = ? (no user_id filter,
-- so the existing (user_id, fingerprint, sent_at) index cannot be used).
-- The real duplicate guard is alerts_user_fingerprint_unique on public.alerts;
-- this only makes the advisory pre-check cheap.
CREATE INDEX IF NOT EXISTS idx_notification_history_fingerprint
  ON public.notification_history (fingerprint);
