-- =============================================
-- Migration: 20261028000000_optimize_realtime_io.sql
-- Purpose: Reduce Disk IO by removing notification_history from realtime
--          and adding a cleanup function for old notifications
-- Related: Supabase IO Forensics report (2026-10-28)
-- =============================================

-- 1. Remove notification_history from realtime publication (idempotent)
-- This stops 1.29M list_changes() polls/day on this table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notification_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.notification_history;
  END IF;
END $$;

-- 2. Create cleanup function for old notifications (90-day retention)
-- Only service_role (crons) can execute this
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void AS $$
BEGIN
  DELETE FROM public.notification_history
  WHERE sent_at < now() - interval '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Revoke from all roles, grant only to service_role
REVOKE EXECUTE ON FUNCTION public.cleanup_old_notifications() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_notifications() TO service_role;

-- 3. Optional: Verify what's left in the realtime publication
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';