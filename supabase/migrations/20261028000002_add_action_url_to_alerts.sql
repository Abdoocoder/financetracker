-- Add action_url column to alerts for persistent navigation
ALTER TABLE public.alerts 
  ADD COLUMN IF NOT EXISTS action_url text;

-- Optional: backfill from existing notification_history
UPDATE public.alerts a
SET action_url = nh.data->>'url'
FROM public.notification_history nh
WHERE a.fingerprint = nh.fingerprint
  AND a.action_url IS NULL
  AND nh.data->>'url' IS NOT NULL;

-- Index for fast filtering (only when action_url is set)
CREATE INDEX IF NOT EXISTS idx_alerts_action_url 
  ON public.alerts (user_id, action_url) 
  WHERE action_url IS NOT NULL;