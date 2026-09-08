-- =============================================================
-- 047_add_debt_type_and_dashboard_acl.sql
--
-- Restores prod parity for fresh/seed-only DBs in three ways:
--
-- 1. Adds the debts.debt_type column. Prod created it via the SQL editor
--    (the archived legacy deck 035 + top-level 046 reference it), so a
--    clean replay left the column missing while the runtime bodies expect
--    it. After this migration, 046's plpgsql bodies can run.
--
-- 2. Re-asserts the get_financial_dashboard and delete_user_account ACL
--    lockdowns. 044/045 skip those functions when they are absent
--    (seed-only DBs), and 046 then recreates both as plpgsql — where a
--    brand-new function defaults to PUBLIC EXECUTE. This migration closes
--    that gap idempotently.
--
-- This file is safe to apply on prod: ADD COLUMN IF NOT EXISTS is a no-op
-- there and the REVOKE/GRANT statements simply restate existing state.
-- =============================================================

ALTER TABLE public.debts
  ADD COLUMN IF NOT EXISTS debt_type text;

DO $guard$
BEGIN
  IF to_regprocedure('public.get_financial_dashboard(uuid, double precision)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_financial_dashboard(uuid, double precision) FROM anon';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_financial_dashboard(uuid, double precision) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_financial_dashboard(uuid, double precision) TO authenticated';
  END IF;
  IF to_regprocedure('public.delete_user_account(uuid)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.delete_user_account(uuid) FROM anon';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.delete_user_account(uuid) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO authenticated';
  END IF;
END
$guard$;