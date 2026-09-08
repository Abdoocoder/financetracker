-- =============================================
-- 051_rls_policy_perf_style.sql
-- RLS policy performance hygiene for chats / messages / user_byok_keys.
--
-- Pure rewording, no semantic change:
--   auth.uid()                 -> (select auth.uid())
--
-- Bare auth.uid() is a per-row stable() function call. Wrapping it in a
-- scalar SELECT turns it into an InitPlan that Postgres evaluates once per
-- statement, instead of firing once per row (or per EXISTS re-check).
-- This is Supabase's documented RLS performance recommendation
-- (perf_health_check.advisor / performance optimization guide).
--
-- Verification performed on production before authoring this diff
-- (pg_policies dump):
--   * chats           — 4 policies (view/insert/update/delete), rows owned by user_id
--   * messages        — 2 policies (view/insert), EXISTS on chats.user_id ownership
--   * user_byok_keys  — 4 policies (view/insert/update/delete), rows owned by user_id
--   * all PERMISSIVE, role {public}, NO auth.jwt() usage anywhere.
--
-- Preservation guarantees:
--   * policy names, commands, roles, permissive flag, USING + WITH CHECK
--   * ownership model (user_id = auth.uid()) and EXISTS subquery shape
--   * grants, indexes, table structure untouched
-- =============================================

begin;

-- public.chats --------------------------------------------------------------
drop policy if exists "Users can view own chats" on public.chats;
create policy "Users can view own chats" on public.chats
  for select using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own chats" on public.chats;
create policy "Users can insert own chats" on public.chats
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own chats" on public.chats;
create policy "Users can update own chats" on public.chats
  for update using ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own chats" on public.chats;
create policy "Users can delete own chats" on public.chats
  for delete using ((select auth.uid()) = user_id);

-- public.messages -----------------------------------------------------------
drop policy if exists "Users can view messages in own chats" on public.messages;
create policy "Users can view messages in own chats" on public.messages
  for select using (exists (
    select 1 from public.chats c
    where c.id = messages.chat_id and c.user_id = (select auth.uid())
  ));

drop policy if exists "Users can insert messages in own chats" on public.messages;
create policy "Users can insert messages in own chats" on public.messages
  for insert with check (exists (
    select 1 from public.chats c
    where c.id = messages.chat_id and c.user_id = (select auth.uid())
  ));

-- public.user_byok_keys -----------------------------------------------------
drop policy if exists "Users view own byok keys" on public.user_byok_keys;
create policy "Users view own byok keys" on public.user_byok_keys
  for select using ((select auth.uid()) = user_id);

drop policy if exists "Users insert own byok keys" on public.user_byok_keys;
create policy "Users insert own byok keys" on public.user_byok_keys
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists "Users update own byok keys" on public.user_byok_keys;
create policy "Users update own byok keys" on public.user_byok_keys
  for update using ((select auth.uid()) = user_id);

drop policy if exists "Users delete own byok keys" on public.user_byok_keys;
create policy "Users delete own byok keys" on public.user_byok_keys
  for delete using ((select auth.uid()) = user_id);

commit;