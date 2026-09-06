-- =============================================
-- Fix remaining RLS issues
-- =============================================

-- =============================================
-- SAVING CHALLENGES
-- Fix auth.uid() re-evaluation per row
-- =============================================
DROP POLICY IF EXISTS "Users can manage own challenges" ON public.saving_challenges;

CREATE POLICY "Users can manage own challenges" ON public.saving_challenges
  FOR ALL USING ((select auth.uid()) = user_id);

-- =============================================
-- TESTIMONIALS
-- Fix duplicate SELECT policies:
-- "Public can view visible testimonials" (SELECT WHERE is_visible=true)
-- "Users own testimonials" (ALL) -- conflicts on SELECT
-- Solution: split "Users own testimonials" into write-only operations
-- =============================================
DROP POLICY IF EXISTS "Users own testimonials" ON public.testimonials;

CREATE POLICY "Users own testimonials insert" ON public.testimonials
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users own testimonials update" ON public.testimonials
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users own testimonials delete" ON public.testimonials
  FOR DELETE USING ((select auth.uid()) = user_id);

-- Fix auth.uid() in the existing public SELECT policy if it exists
DROP POLICY IF EXISTS "Public can view visible testimonials" ON public.testimonials;

CREATE POLICY "Public can view visible testimonials" ON public.testimonials
  FOR SELECT USING (is_visible = true);
