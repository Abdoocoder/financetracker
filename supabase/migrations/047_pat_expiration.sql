-- =============================================
-- 047_pat_expiration.sql
-- Add expires_at column to user_api_keys with default 90 days
-- Add rotation UX support (rotated_at, rotation_reason)
-- =============================================

begin;

-- Add expires_at column with default 90 days from creation
alter table public.user_api_keys
  add column if not exists expires_at timestamptz
    default (created_at + interval '90 days');

-- Add rotation tracking columns
alter table public.user_api_keys
  add column if not exists rotated_at timestamptz;

alter table public.user_api_keys
  add column if not exists rotation_reason text;

-- Index for efficient expiry cleanup queries
create index if not exists idx_user_api_keys_expires_at
  on public.user_api_keys (expires_at)
  where expires_at is not null;

-- Update existing keys that don't have expires_at (set to 90 days from created_at)
update public.user_api_keys
set expires_at = created_at + interval '90 days'
where expires_at is null;

-- RLS policy already exists (from migration 039) - owner can manage their keys
-- Ensure authenticated can select their own active non-expired keys
-- The existing policy covers this via auth.uid() = user_id

commit;