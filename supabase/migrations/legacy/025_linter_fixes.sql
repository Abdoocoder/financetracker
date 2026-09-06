-- =============================================
-- 025_linter_fixes.sql
-- Resolves Supabase configuration warnings
-- =============================================

-- =============================================
-- 1. function_search_path_mutable
-- Security best practice: Explicitly declare the schema search path 
-- for SECURITY DEFINER functions so they cannot be hijacked by malicious schemas.
-- =============================================

ALTER FUNCTION public.notify_user(uuid, notification_category, text, text, jsonb, text)
  SET search_path = public;

ALTER FUNCTION public.check_budget_limits()
  SET search_path = public;


-- =============================================
-- 2. rls_policy_always_true & auth_rls_initplan
-- The insertion into notification_history shouldn't use a permissive WITH CHECK (true).
-- We also wrap auth.uid() in (select ...) to prevent per-row re-evaluation (Performance).
-- =============================================

-- notification_history
DROP POLICY IF EXISTS "System management of notification history" ON public.notification_history;
DROP POLICY IF EXISTS "Users view own notification history" ON public.notification_history;
DROP POLICY IF EXISTS "Users insert own notification history" ON public.notification_history;

CREATE POLICY "Users view own notification history" ON public.notification_history
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users insert own notification history" ON public.notification_history
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

-- notification_preferences
DROP POLICY IF EXISTS "Users manage own notification preferences" ON public.notification_preferences;

CREATE POLICY "Users manage own notification preferences" ON public.notification_preferences
  FOR ALL USING ((SELECT auth.uid()) = user_id);
