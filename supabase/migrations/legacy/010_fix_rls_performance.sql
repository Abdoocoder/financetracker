-- =============================================
-- Fix RLS Performance Issues
-- 1. Replace auth.uid() with (select auth.uid()) to prevent per-row re-evaluation
-- 2. Remove duplicate permissive policies
-- =============================================

-- =============================================
-- PROFILES
-- =============================================
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING ((select auth.uid()) = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING ((select auth.uid()) = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK ((select auth.uid()) = id);

-- =============================================
-- TRANSACTIONS
-- Drop duplicate policies, keep single ALL policy with fixed auth.uid()
-- =============================================
DROP POLICY IF EXISTS "Users own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;

CREATE POLICY "Users own transactions" ON public.transactions
  FOR ALL USING ((select auth.uid()) = user_id);

-- =============================================
-- DEBTS
-- =============================================
DROP POLICY IF EXISTS "Users own debts" ON public.debts;

CREATE POLICY "Users own debts" ON public.debts
  FOR ALL USING ((select auth.uid()) = user_id);

-- =============================================
-- DEBT PAYMENTS
-- =============================================
DROP POLICY IF EXISTS "Users own debt_payments" ON public.debt_payments;

CREATE POLICY "Users own debt_payments" ON public.debt_payments
  FOR ALL USING ((select auth.uid()) = user_id);

-- =============================================
-- INVESTMENTS
-- =============================================
DROP POLICY IF EXISTS "Users own investments" ON public.investments;

CREATE POLICY "Users own investments" ON public.investments
  FOR ALL USING ((select auth.uid()) = user_id);

-- =============================================
-- INVESTMENT TRANSACTIONS
-- =============================================
DROP POLICY IF EXISTS "Users own investment_transactions" ON public.investment_transactions;

CREATE POLICY "Users own investment_transactions" ON public.investment_transactions
  FOR ALL USING ((select auth.uid()) = user_id);

-- =============================================
-- BUDGETS
-- Drop duplicate policies, keep single ALL policy with fixed auth.uid()
-- =============================================
DROP POLICY IF EXISTS "Users own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users manage own budgets" ON public.budgets;

CREATE POLICY "Users own budgets" ON public.budgets
  FOR ALL USING ((select auth.uid()) = user_id);

-- =============================================
-- ALERTS
-- =============================================
DROP POLICY IF EXISTS "Users own alerts" ON public.alerts;

CREATE POLICY "Users own alerts" ON public.alerts
  FOR ALL USING ((select auth.uid()) = user_id);

-- =============================================
-- SAVINGS GOALS
-- Drop duplicate policies, keep single ALL policy with fixed auth.uid()
-- =============================================
DROP POLICY IF EXISTS "Users own savings_goals" ON public.savings_goals;
DROP POLICY IF EXISTS "Users can select own goals" ON public.savings_goals;
DROP POLICY IF EXISTS "Users can insert own goals" ON public.savings_goals;
DROP POLICY IF EXISTS "Users can update own goals" ON public.savings_goals;
DROP POLICY IF EXISTS "Users can delete own goals" ON public.savings_goals;

CREATE POLICY "Users own savings_goals" ON public.savings_goals
  FOR ALL USING ((select auth.uid()) = user_id);

-- =============================================
-- PUSH SUBSCRIPTIONS
-- =============================================
DROP POLICY IF EXISTS "users manage own subs" ON public.push_subscriptions;

CREATE POLICY "users manage own subs" ON public.push_subscriptions
  FOR ALL USING ((select auth.uid()) = user_id);

-- =============================================
-- USER STATS (primary key `id` = user_id)
-- =============================================
DROP POLICY IF EXISTS "Users own stats" ON public.user_stats;

CREATE POLICY "Users own stats" ON public.user_stats
  FOR ALL USING ((select auth.uid()) = id);

-- =============================================
-- TESTIMONIALS
-- =============================================
DROP POLICY IF EXISTS "Users own testimonials" ON public.testimonials;

CREATE POLICY "Users own testimonials" ON public.testimonials
  FOR ALL USING ((select auth.uid()) = user_id);

-- =============================================
-- APP EVENTS
-- =============================================
DROP POLICY IF EXISTS "Users can insert their own events" ON public.app_events;
DROP POLICY IF EXISTS "Users can view their own events" ON public.app_events;

CREATE POLICY "Users can insert their own events" ON public.app_events
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can view their own events" ON public.app_events
  FOR SELECT USING ((select auth.uid()) = user_id);

-- =============================================
-- HEALTH SCORE HISTORY
-- =============================================
DROP POLICY IF EXISTS "users manage own scores" ON public.health_score_history;

CREATE POLICY "users manage own scores" ON public.health_score_history
  FOR ALL USING ((select auth.uid()) = user_id);

-- =============================================
-- ZAKAT HISTORY
-- =============================================
DROP POLICY IF EXISTS "users manage own zakat" ON public.zakat_history;

CREATE POLICY "users manage own zakat" ON public.zakat_history
  FOR ALL USING ((select auth.uid()) = user_id);
