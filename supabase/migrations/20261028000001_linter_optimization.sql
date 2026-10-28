-- Migration: 20261028000001_linter_optimization.sql
-- Description: Surgical index optimization based on linter forensics
-- Author: opencode (systematic-debugging + gsd-forensics + supabase skills)
-- Date: 2026-10-28

-- ============================================================================
-- CONTEXT
-- ============================================================================
-- Supabase Linter reported:
--   13 unindexed foreign keys
--   19 unused indexes
--
-- Forensic investigation (/tmp/linter-forensics.md) found:
--   • ALL 13 tables with unindexed FKs have < 100 rows → DEFER (write IO waste)
--   • 14 of 19 unused indexes safe to DROP (idx_scan=0, tables <500 rows, not _updated_sync)
--   • 5 _updated_sync indexes KEPT conservatively (RPCs use updated_at, Flutter sync warning)
--   • All RLS policies filter on FK columns but tables too small for index benefit
--
-- HARD CONSTRAINTS APPLIED:
--   ✅ Do NOT add index to table with < 100 rows
--   ✅ Do NOT drop _updated_sync without proving unused by Flutter app
--   ✅ RLS always respected — indexes deferred, not ignored

-- ============================================================================
-- DROP: 14 unused regular indexes (idx_scan=0, tables <500 rows)
-- ============================================================================

-- idx_debts_user_unpaid_type: debts table (3 rows), never scanned
DROP INDEX IF EXISTS idx_debts_user_unpaid_type;

-- idx_idempotency_keys_expires_at: idempotency_keys table (0 rows), never scanned
DROP INDEX IF EXISTS idx_idempotency_keys_expires_at;

-- idx_idempotency_keys_user_hash: idempotency_keys table (0 rows), never scanned
DROP INDEX IF EXISTS idx_idempotency_keys_user_hash;

-- idx_debts_user_unpaid: debts table (3 rows), never scanned
DROP INDEX IF EXISTS idx_debts_user_unpaid;

-- idx_api_audit_log_key_time: api_audit_log table (12 rows), never scanned
DROP INDEX IF EXISTS idx_api_audit_log_key_time;

-- idx_savings_goals_user_id: savings_goals table (0 rows), never scanned
DROP INDEX IF EXISTS idx_savings_goals_user_id;

-- idx_recurring_user_active: recurring_transactions table (0 rows), never scanned
DROP INDEX IF EXISTS idx_recurring_user_active;

-- idx_recurring_next_date: recurring_transactions table (0 rows), never scanned
DROP INDEX IF EXISTS idx_recurring_next_date;

-- idx_accounts_user: accounts table (2 rows), never scanned
DROP INDEX IF EXISTS idx_accounts_user;

-- idx_user_api_keys_expires_at: user_api_keys table (0 rows), never scanned
DROP INDEX IF EXISTS idx_user_api_keys_expires_at;

-- idx_debts_deleted_at: debts table (3 rows), never scanned
DROP INDEX IF EXISTS idx_debts_deleted_at;

-- idx_savings_goals_deleted_at: savings_goals table (0 rows), never scanned
DROP INDEX IF EXISTS idx_savings_goals_deleted_at;

-- idx_budgets_deleted_at: budgets table (12 rows), never scanned
DROP INDEX IF EXISTS idx_budgets_deleted_at;

-- idx_investments_deleted_at: investments table (2 rows), never scanned
DROP INDEX IF EXISTS idx_investments_deleted_at;

-- ============================================================================
-- KEEP: 5 _updated_sync indexes (conservative — RPCs use updated_at)
-- ============================================================================
-- These are NOT dropped despite idx_scan=0 because:
-- 1. Server-side RPCs (get_changed_records, get_deleted_records) query updated_at
-- 2. Flutter sync_service.dart uses these RPCs for offline sync
-- 3. Warning: "Dropping '_updated_sync' indexes might break Flutter's Drift/SQLCipher Offline Sync"
-- 4. Current indexes are single-column (updated_at) — not optimal for RPC's user_id+updated_at pattern
--    Consider future migration to composite (user_id, updated_at) when tables grow

-- KEPT: idx_transactions_updated_sync (transactions: 1,245 rows)
-- KEPT: idx_debts_updated_sync (debts: 3 rows)
-- KEPT: idx_savings_goals_updated_sync (savings_goals: 0 rows)
-- KEPT: idx_budgets_updated_sync (budgets: 12 rows)
-- KEPT: idx_investments_updated_sync (investments: 2 rows)

-- ============================================================================
-- DEFER: 13 unindexed FKs (all tables < 100 rows — sequential scan optimal)
-- ============================================================================
-- When any table exceeds 100 rows, re-evaluate and add:
--   CREATE INDEX IF NOT EXISTS idx_<table>_<fk_column> ON <table> (<fk_column>);
--
-- Tables to watch:
--   • api_audit_log.user_id, api_audit_log.api_key_id
--   • budget_alert_log.user_id, budget_alert_log.budget_id
--   • chats.user_id
--   • debt_payments.user_id, debt_payments.debt_id
--   • investment_transactions.user_id, investment_transactions.investment_id
--   • investments.user_id
--   • messages.chat_id
--   • saving_challenges.user_id
--   • testimonials.user_id
--   • user_api_keys.user_id

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After migration, verify:
--   SELECT indexrelname, idx_scan FROM pg_stat_user_indexes
--     WHERE indexrelname IN (
--       'idx_debts_user_unpaid_type','idx_idempotency_keys_expires_at',
--       'idx_idempotency_keys_user_hash','idx_debts_user_unpaid',
--       'idx_api_audit_log_key_time','idx_savings_goals_user_id',
--       'idx_recurring_user_active','idx_recurring_next_date',
--       'idx_accounts_user','idx_user_api_keys_expires_at',
--       'idx_debts_deleted_at','idx_savings_goals_deleted_at',
--       'idx_budgets_deleted_at','idx_investments_deleted_at'
--     );
-- All should return 0 rows (dropped)
--
-- _updated_sync indexes should still exist:
--   SELECT indexname FROM pg_indexes WHERE indexname LIKE '%_updated_sync';
-- Should return 5 rows