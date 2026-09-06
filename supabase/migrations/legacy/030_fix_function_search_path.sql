-- Fix mutable search_path warnings for 3 functions.
-- Adding SET search_path = public prevents search_path injection attacks.

alter function public.get_account_balances(uuid)
  set search_path = public;

alter function public.get_financial_dashboard(uuid, double precision)
  set search_path = public;

alter function public.get_zakat_summary(uuid, double precision, double precision, double precision)
  set search_path = public;
