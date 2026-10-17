-- Migration: 20261018000000_linter_security_hardening.sql
-- Purpose: Harden the 7 RPCs still reachable by anon, pin search_path, drop dup index.
--
-- IMPORTANT: `REVOKE EXECUTE ... FROM anon` alone is INSUFFICIENT in PostgreSQL,
-- because functions inherit EXECUTE from PUBLIC by default. We must REVOKE from
-- PUBLIC + anon, then GRANT explicitly to authenticated + service_role.

-- ── A) Harden the 7 RPCs ───────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.calculate_health_score(uuid, double precision)            FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.calculate_health_score(uuid, double precision)            TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_health_score(uuid)                                    FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_health_score(uuid)                                    TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.check_and_reserve_idempotency_key(uuid, text, timestamptz) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.check_and_reserve_idempotency_key(uuid, text, timestamptz) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.complete_idempotency_key(uuid, text, uuid)                FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.complete_idempotency_key(uuid, text, uuid)                TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.cleanup_expired_idempotency_keys()                        FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.cleanup_expired_idempotency_keys()                        TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_changed_records(uuid, text, timestamptz, integer, integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_changed_records(uuid, text, timestamptz, integer, integer) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_deleted_records(uuid, text, timestamptz)              FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_deleted_records(uuid, text, timestamptz)              TO authenticated, service_role;

-- ── B) Pin search_path on the 4 flagged functions ─────────────────────────
ALTER FUNCTION public.cleanup_expired_idempotency_keys()                        SET search_path = public;
ALTER FUNCTION public.check_and_reserve_idempotency_key(uuid, text, timestamptz) SET search_path = public;
ALTER FUNCTION public.complete_idempotency_key(uuid, text, uuid)                SET search_path = public;
ALTER FUNCTION public.update_updated_at_column()                                SET search_path = public;

-- ── C) Drop the duplicate index ───────────────────────────────────────────
DROP INDEX IF EXISTS public.health_score_history_user_date_uniq;