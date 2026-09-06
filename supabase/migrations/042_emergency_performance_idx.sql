-- =============================================
-- 042_emergency_performance_idx.sql
-- Emergency Disk IO Budget mitigation — targeted B-Tree indexes
-- All columns used below exist in the archived legacy migrations,
-- so these build cleanly on a fresh migrations-applied database.
-- Every index is idempotent (IF NOT EXISTS) — safe to re-run.
-- =============================================

-- =============================================
-- 1. TRANSACTIONS — (user_id, category, transaction_date)
--    Serves two hot paths:
--      a) trg_check_budget_limits (023): on EVERY transaction insert an
--         aggregate sum(category) over the whole month for that user →
--         replaces a month-long scan with an index-only scan.
--      b) auto-salary dedup (app/api/auto-salary): exact match on
--         (user_id, type='income', category='راتب', transaction_date).
-- =============================================
CREATE INDEX IF NOT EXISTS idx_transactions_user_cat_date
  ON public.transactions(user_id, category, transaction_date);

-- =============================================
-- 2. TRANSACTIONS — partial (recurring_day) WHERE recurring
--    Auto-recurring Loop-1 (app/api/auto-recurring) selects ALL recurring
--    templates each day:
--      WHERE is_recurring = true AND recurring_day = <dayOfMonth>
--    No index existed on is_recurring/recurring_day → daily full scan.
-- =============================================
CREATE INDEX IF NOT EXISTS idx_transactions_recurring_day_active
  ON public.transactions(recurring_day)
  WHERE is_recurring IS TRUE;

-- =============================================
-- 3. TRANSACTIONS — (source_recurring_id, transaction_date)
--    Auto-recurring Loop-2 dedup:
--      WHERE source_recurring_id IN (...) AND transaction_date = <today>
--    source_recurring_id (FK, 014) was completely unindexed.
-- =============================================
CREATE INDEX IF NOT EXISTS idx_transactions_source_recurring_date
  ON public.transactions(source_recurring_id, transaction_date);

-- =============================================
-- 4. DEBTS — partial (payment_day, auto_deduct) WHERE unpaid
--    Auto-debt daily run (app/api/auto-debt) fires two full-table scans
--    of debts on cron (auto_deduct true + false branches):
--      WHERE auto_deduct = ? AND is_paid = false AND payment_day = <day>
--        AND remaining_amount > 0
-- =============================================
CREATE INDEX IF NOT EXISTS idx_debts_payment_day_pending
  ON public.debts(payment_day, auto_deduct)
  WHERE is_paid = false;

-- =============================================
-- 5. DEBT_PAYMENTS — (debt_id, payment_date)
--    Auto-debt monthly "already paid this month?" checks issue a
--    range scan on payment_date per debt:
--      WHERE debt_id = ? [AND notes = 'دفعة تلقائية']
--        AND payment_date >= <month start> [AND payment_date < next month]
--    Existing idx_debt_payments_debt_id stops at the FK — this adds the
--    date range (complements idx_debt_payments_debt_month_unique).
-- =============================================
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_date
  ON public.debt_payments(debt_id, payment_date);

-- =============================================
-- 6. NOTIFICATION_HISTORY — user inbox (user_id, sent_at DESC)
--    notification_history had NO indexes at all. Inbox / history views
--    list per user ordered by sent_at — now a targeted index scan.
-- =============================================
CREATE INDEX IF NOT EXISTS idx_notification_history_user_sent
  ON public.notification_history(user_id, sent_at DESC);

-- =============================================
-- 7. NOTIFICATION_HISTORY — dedup key (user_id, fingerprint, sent_at)
--    public.notify_user() (023) runs this EXISTS on EVERY notification
--    pushed by the smart-notifications cron (morning/evening/weekly/
--    wealth/lesson):
--      WHERE user_id = ? AND fingerprint = ? AND sent_at > now() - '24h'
--    Without an index this was a full scan of notification_history per
--    push — the single biggest IO amplifier in the cron stack.
--    The UNIQUE(user_id, category) index on notification_preferences
--    already covers the preference lookup inside notify_user().
-- =============================================
CREATE INDEX IF NOT EXISTS idx_notification_history_user_fingerprint
  ON public.notification_history(user_id, fingerprint, sent_at DESC);