-- A) Revoke anon EXECUTE from internal RPCs (Defense in depth)
-- This prevents unauthenticated users from even attempting to call these functions.
REVOKE EXECUTE ON FUNCTION public.calculate_health_score(uuid, double precision) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_health_score(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_financial_dashboard(uuid, double precision) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_account_balances(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_monthly_financial_summary(uuid, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_zakat_summary(uuid, double precision, double precision, double precision) FROM anon;
REVOKE EXECUTE ON FUNCTION public.upsert_investment_cash(uuid, text, numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_changed_records(uuid, text, timestamptz, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_deleted_records(uuid, text, timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_user_account(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_and_reserve_idempotency_key(uuid, text, timestamptz) FROM anon;
REVOKE EXECUTE ON FUNCTION public.complete_idempotency_key(uuid, text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_idempotency_keys() FROM anon;

-- B) Fix mutable search_path (4 functions)
ALTER FUNCTION public.cleanup_expired_idempotency_keys() SET search_path = public;
ALTER FUNCTION public.check_and_reserve_idempotency_key(uuid, text, timestamptz) SET search_path = public;
ALTER FUNCTION public.complete_idempotency_key(uuid, text, uuid) SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- C) Drop the duplicate index (safe)
DROP INDEX IF EXISTS public.health_score_history_user_date_uniq;
