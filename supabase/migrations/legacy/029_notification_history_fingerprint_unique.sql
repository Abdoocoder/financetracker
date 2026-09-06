-- Add a unique constraint on fingerprint so duplicate notifications are
-- rejected at the database level (error 23505), enabling atomic deduplication
-- in push-send.ts without a separate SELECT check.

create unique index if not exists idx_notification_history_fingerprint
  on public.notification_history (fingerprint)
  where fingerprint is not null;
