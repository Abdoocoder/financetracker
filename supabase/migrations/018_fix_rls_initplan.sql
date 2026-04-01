-- Fix RLS initialization plan performance warnings
-- Replace auth.uid() with (select auth.uid()) so it's evaluated once per query, not per row.
-- See: https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan

-- investment_cash
drop policy if exists "Users own investment_cash" on public.investment_cash;
create policy "Users own investment_cash"
  on public.investment_cash for all
  using ((select auth.uid()) = user_id);

-- recurring_transactions
drop policy if exists "Users own recurring_transactions" on public.recurring_transactions;
create policy "Users own recurring_transactions"
  on public.recurring_transactions for all
  using ((select auth.uid()) = user_id);

-- budget_alert_log
drop policy if exists "Users own budget_alert_log" on public.budget_alert_log;
create policy "Users own budget_alert_log"
  on public.budget_alert_log for all
  using ((select auth.uid()) = user_id);
