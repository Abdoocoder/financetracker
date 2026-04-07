-- Fix RLS initplan performance warnings.
-- Wrapping auth.uid() in (select auth.uid()) causes it to be evaluated once
-- per query instead of once per row — significant improvement at scale.

-- notification_preferences
drop policy if exists "Users manage own notification preferences" on public.notification_preferences;
create policy "Users manage own notification preferences"
  on public.notification_preferences
  for all
  using ((select auth.uid()) = user_id);

-- notification_history (SELECT)
drop policy if exists "Users view own notification history" on public.notification_history;
create policy "Users view own notification history"
  on public.notification_history
  for select
  using ((select auth.uid()) = user_id);

-- notification_history (INSERT)
drop policy if exists "Users insert own notification history" on public.notification_history;
drop policy if exists "System management of notification history" on public.notification_history;
create policy "System management of notification history"
  on public.notification_history
  for insert
  with check (true);
