-- Remove the overly permissive INSERT policy on notification_history.
-- All inserts come from the service role (admin client / Edge Function / SECURITY DEFINER functions)
-- which bypass RLS entirely — so no INSERT policy is needed for legitimate writes.
-- Regular authenticated users should never insert directly into this table.

drop policy if exists "System management of notification history" on public.notification_history;
drop policy if exists "Users insert own notification history" on public.notification_history;
