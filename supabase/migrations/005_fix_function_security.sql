-- =============================================
-- Fix Security Warnings: Function Search Path
-- =============================================

-- Fix mutable search path for delete_user_account
-- This prevents search path hijacking for SECURITY DEFINER functions.
ALTER FUNCTION public.delete_user_account(uuid) SET search_path = public;

-- Proactively fix handle_new_user as it is also SECURITY DEFINER
-- This ensures best practices and prevents similar future warnings.
ALTER FUNCTION public.handle_new_user() SET search_path = public;
