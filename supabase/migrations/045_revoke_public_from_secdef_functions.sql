-- =============================================
-- 045_revoke_public_from_secdef_functions.sql
-- Completes the advisor_function_lockdown (044).
--
-- Problem found post-044: PostgreSQL grants EXECUTE on new functions to
-- PUBLIC by default (=X/postgres in proacl). REVOKEing from `anon` and
-- `authenticated` in 044 removed their *explicit* grants, but the PUBLIC
-- grant remained — and anon/authenticated are members of PUBLIC. So the
-- linter (correctly) still reports the SECURITY DEFINER functions as
-- reachable by unauthenticated callers.
--
-- Fix: REVOKE EXECUTE FROM PUBLIC on every security-definer function,
-- then re-GRANT EXECUTE to `authenticated` for the 6 user-facing RPCs
-- (the PUBLIC revocation would otherwise strip them too). `service_role`
-- keeps its explicit grant (verified present in prod and local).
--
-- Trigger safety holds: trigger-fired functions run as the table owner
-- without an EXECUTE privilege check, so revoking PUBLIC does not break
-- the budget/debt/notify/updated_at triggers.
-- =============================================

-- =============================================
-- 1. Revoke PUBLIC from the 7 internal trigger/utility functions.
--    Only service_role (explicit grant) + postgres may now execute.
--    Direct RPC calls are blocked for everyone except service_role.
-- =============================================

REVOKE EXECUTE ON FUNCTION public.handle_new_user()
  FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.assign_default_account()
  FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.check_budget_limits()
  FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.sync_debt_remaining_foreign()
  FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.update_updated_at_column()
  FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.notify_user(
  uuid, public.notification_category, text, text, jsonb, text
)
  FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.create_default_account_for_user(uuid)
  FROM PUBLIC;

-- =============================================
-- 2. Revoke PUBLIC from the 6 user-facing RPCs, then re-grant EXECUTE to
--    `authenticated`. anon is still blocked (no anon grant, no PUBLIC).
-- =============================================

REVOKE EXECUTE ON FUNCTION public.get_account_balances(uuid)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_account_balances(uuid)
  TO authenticated;

-- get_financial_dashboard and delete_user_account may be absent in
-- seed-only/fresh DBs (see 044). Both are recreated as plpgsql by 046, so
-- guard all their ACL statements here; 047 re-asserts the lockdown for the
-- functions 046 re-creates.
DO $guard$
BEGIN
  IF to_regprocedure('public.get_financial_dashboard(uuid, double precision)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.get_financial_dashboard(uuid, double precision) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_financial_dashboard(uuid, double precision) TO authenticated';
  END IF;
  IF to_regprocedure('public.delete_user_account(uuid)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.delete_user_account(uuid) FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO authenticated';
  END IF;
END
$guard$;

REVOKE EXECUTE ON FUNCTION public.get_monthly_financial_summary(uuid, int, int)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_monthly_financial_summary(uuid, int, int)
  TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_zakat_summary(
  uuid, double precision, double precision, double precision
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_zakat_summary(
  uuid, double precision, double precision, double precision
) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.upsert_investment_cash(uuid, text, numeric)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_investment_cash(uuid, text, numeric)
  TO authenticated;