-- =============================================
-- 044_advisor_function_lockdown.sql
-- Resolves Supabase database linter SECURITY advisories:
--   1. function_search_path_mutable (0011)
--   2. anon_security_definer_function_executable (0097)
--   3. authenticated_security_definer_function_executable (0098)
--
-- Design notes
-- ============
-- * SECURITY DEFINER functions run with the OWNER's privileges (not the
--   caller's) and bypass RLS. They all take an explicit `p_user_id` and the
--   application verifies it matches auth.uid() before calling. Any user who
--   can directly invoke them (e.g. via /rest/v1/rpc/...) could pass an
--   arbitrary user id and read/modify another user's data. This is an
--   access-control gap.
--
-- * We therefore revoke EXECUTE from `anon` on EVERY security-definer
--   function (unauthenticated callers must never reach them).
--
-- * The 6 user-facing RPCs keep EXECUTE for `authenticated` only, and we
--   GRANT it explicitly to be self-documenting.
--
-- * The 7 internal TRIGGER/utility functions are NOT invoked directly by
--   the app. Triggers call functions as the table owner (not via GRANT), so
--   revoking EXECUTE from both `anon` and `authenticated` does NOT break the
--   triggers — it only blocks direct RPC calls.
-- =============================================

-- =============================================
-- 1. function_search_path_mutable
--    Trigger functions are not SECURITY DEFINER, but an explicit search_path
--    is still recommended to avoid resolving helper objects in the wrong
--    schema. Match the existing `SET search_path = public` convention.
-- =============================================

ALTER FUNCTION public.sync_debt_remaining_foreign()
  SET search_path = public;

ALTER FUNCTION public.update_updated_at_column()
  SET search_path = public;

-- =============================================
-- 2+3. Lock down the 7 internal functions from BOTH anon and authenticated.
--       (direct RPC calls blocked; triggers unaffected)
-- =============================================

REVOKE EXECUTE ON FUNCTION public.handle_new_user()
  FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.assign_default_account()
  FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.check_budget_limits()
  FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.sync_debt_remaining_foreign()
  FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.update_updated_at_column()
  FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.notify_user(
  uuid, public.notification_category, text, text, jsonb, text
)
  FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.create_default_account_for_user(uuid)
  FROM anon, authenticated;

-- =============================================
-- 2+3. Revoke anon from the 6 user-facing RPCs, then re-grant authenticated
--       explicitly. Only signed-in users may call them.
-- =============================================

REVOKE EXECUTE ON FUNCTION public.get_account_balances(uuid)
  FROM anon;
GRANT EXECUTE ON FUNCTION public.get_account_balances(uuid)
  TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_financial_dashboard(uuid, double precision)
  FROM anon;
GRANT EXECUTE ON FUNCTION public.get_financial_dashboard(uuid, double precision)
  TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_monthly_financial_summary(uuid, int, int)
  FROM anon;
GRANT EXECUTE ON FUNCTION public.get_monthly_financial_summary(uuid, int, int)
  TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_zakat_summary(
  uuid, double precision, double precision, double precision
) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_zakat_summary(
  uuid, double precision, double precision, double precision
) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.delete_user_account(uuid)
  FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid)
  TO authenticated;

REVOKE EXECUTE ON FUNCTION public.upsert_investment_cash(uuid, text, numeric)
  FROM anon;
GRANT EXECUTE ON FUNCTION public.upsert_investment_cash(uuid, text, numeric)
  TO authenticated;
