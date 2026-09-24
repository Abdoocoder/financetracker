-- Fix RLS initplan advisory (auth_rls_initplan) + drop 21 unused public indexes
-- Linked project: ujwcvtpwsaidljecqbaa (fajrak), Postgres 17.6.1.084
--
-- 1) Rewrite the 6 flagged plain `auth.uid()` RLS policies to the `(select auth.uid())`
--    subquery form (matches the fixed pattern used in legacy/010-011/024 migrations) so
--    Postgres can extract a stable initPlan and reuse it across rows in the same query.
--    Each rewrite is idempotent: it only fires when the current expression still contains
--    a plain `auth.uid()` without the `(select auth.uid())` wrapper.
-- 2) Drop the 21 confirmed unused non-PK public-schema indexes (zero scans, Supabase
--    performance advisory). Partial indexes are recreated only if needed later.

begin;

-- ---- Policy rewrites --------------------------------------------------------

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_stats'
      and policyname = 'Users own stats'
      and coalesce(qual, with_check)::text like '%auth.uid()%'
      and coalesce(qual, with_check)::text not like '%(select auth.uid())%'
  ) then
    drop policy if exists "Users own stats" on public.user_stats;
    create policy "Users own stats"
      on public.user_stats for all
      using ((select auth.uid()) = id)
      with check ((select auth.uid()) = id);
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'testimonials'
      and policyname = 'Users own testimonials insert'
      and coalesce(qual, with_check)::text like '%auth.uid()%'
      and coalesce(qual, with_check)::text not like '%(select auth.uid())%'
  ) then
    drop policy if exists "Users own testimonials insert" on public.testimonials;
    create policy "Users own testimonials insert"
      on public.testimonials for insert
      with check ((select auth.uid()) = user_id);
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'testimonials'
      and policyname = 'Users own testimonials update'
      and coalesce(qual, with_check)::text like '%auth.uid()%'
      and coalesce(qual, with_check)::text not like '%(select auth.uid())%'
  ) then
    drop policy if exists "Users own testimonials update" on public.testimonials;
    create policy "Users own testimonials update"
      on public.testimonials for update
      using ((select auth.uid()) = user_id);
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'testimonials'
      and policyname = 'Users own testimonials delete'
      and coalesce(qual, with_check)::text like '%auth.uid()%'
      and coalesce(qual, with_check)::text not like '%(select auth.uid())%'
  ) then
    drop policy if exists "Users own testimonials delete" on public.testimonials;
    create policy "Users own testimonials delete"
      on public.testimonials for delete
      using ((select auth.uid()) = user_id);
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'saving_challenges'
      and policyname = 'Users can manage own challenges'
      and coalesce(qual, with_check)::text like '%auth.uid()%'
      and coalesce(qual, with_check)::text not like '%(select auth.uid())%'
  ) then
    drop policy if exists "Users can manage own challenges" on public.saving_challenges;
  create policy "Users can manage own challenges"
    on public.saving_challenges for all
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'health_score_history'
      and policyname = 'users manage own scores'
      and coalesce(qual, with_check)::text like '%auth.uid()%'
      and coalesce(qual, with_check)::text not like '%(select auth.uid())%'
  ) then
    drop policy if exists "users manage own scores" on public.health_score_history;
  create policy "users manage own scores"
    on public.health_score_history for all
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);
  end if;
end $$;

-- ---- Drop 21 unused public indexes -------------------------------------------

drop index if exists public.idx_api_audit_log_user_time;
drop index if exists public.idx_budget_alert_log_user_id;
drop index if exists public.idx_budgets_user_date;
drop index if exists public.idx_chats_user_id;
drop index if exists public.idx_chats_user_updated;
drop index if exists public.idx_debt_payments_debt_date;
drop index if exists public.idx_debt_payments_debt_id;
drop index if exists public.idx_debt_payments_user_id;
drop index if exists public.idx_debts_payment_day_pending;
drop index if exists public.idx_investment_transactions_investment_id;
drop index if exists public.idx_investment_transactions_user_id;
drop index if exists public.idx_investments_user;
drop index if exists public.idx_messages_chat_created;
drop index if exists public.idx_messages_chat_id;
drop index if exists public.idx_proxy_usage_minute_bucket;
drop index if exists public.idx_saving_challenges_user_id;
drop index if exists public.idx_testimonials_user_id;
drop index if exists public.idx_transactions_recurring_day_active;
drop index if exists public.idx_user_api_keys_hash;
drop index if exists public.idx_user_api_keys_user_id;
drop index if exists public.idx_user_byok_keys_provider;

commit;