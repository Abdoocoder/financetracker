-- =============================================
-- Enable RLS for app_events table
-- =============================================

-- Ensure table exists with correct structure (if not already created manually)
CREATE TABLE IF NOT EXISTS public.app_events (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_name text NOT NULL,
  properties jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.app_events ENABLE ROW LEVEL SECURITY;

-- Security Policies
DROP POLICY IF EXISTS "Users can insert their own events" ON public.app_events;
CREATE POLICY "Users can insert their own events" ON public.app_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own events" ON public.app_events;
CREATE POLICY "Users can view their own events" ON public.app_events
  FOR SELECT USING (auth.uid() = user_id);

-- Optional: Index on user_id for performance
CREATE INDEX IF NOT EXISTS idx_app_events_user_id ON public.app_events(user_id);
