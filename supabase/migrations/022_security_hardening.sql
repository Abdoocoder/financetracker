-- =============================================
-- 022_security_hardening.sql
-- Fix function search_path to prevent security warnings
-- See: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
-- =============================================

-- 1. create_default_account_for_user
alter function public.create_default_account_for_user(uuid)
  set search_path = public;

-- 2. assign_default_account (Trigger Function)
alter function public.assign_default_account()
  set search_path = public;

-- 3. get_account_balances
alter function public.get_account_balances(uuid)
  set search_path = public;

-- 4. get_financial_dashboard
alter function public.get_financial_dashboard(uuid, double precision)
  set search_path = public;

-- 5. get_zakat_summary
alter function public.get_zakat_summary(uuid, double precision, double precision, double precision)
  set search_path = public;

-- NOTE: The "auth_leaked_password_protection" warning is a dashboard setting.
-- It is recommended to enable "Leaked Password Protection" in the Supabase 
-- Auth => Management => Password Security dashboard.
