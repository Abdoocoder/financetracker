-- =============================================
-- 048_idempotency_keys.sql
-- Idempotency key storage for create_transaction MCP tool
-- Prevents double-charge on retries / concurrent requests
-- =============================================

begin;

-- Table to store used idempotency keys with 24h TTL
create table if not exists public.idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key_hash text not null,  -- SHA-256 hash of the idempotency key (never store raw)
  transaction_id uuid,     -- References the created transaction (nullable until created)
  created_at timestamptz default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  unique (user_id, key_hash)
);

-- Index for efficient cleanup of expired keys (regular index on expires_at)
create index if not exists idx_idempotency_keys_expires_at
  on public.idempotency_keys (expires_at);

-- Index for fast lookup by user + key
create index if not exists idx_idempotency_keys_user_hash
  on public.idempotency_keys (user_id, key_hash);

-- RLS: Users can only access their own idempotency keys
alter table public.idempotency_keys enable row level security;

drop policy if exists "Users own idempotency keys" on public.idempotency_keys;
create policy "Users own idempotency_keys"
  on public.idempotency_keys for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.idempotency_keys to authenticated;

-- Function to check and reserve an idempotency key
-- Returns: 
--   'available' if key is new and reserved
--   'duplicate' if key exists with completed transaction (returns existing transaction_id)
--   'processing' if key exists but transaction still being created (rare race)
create or replace function public.check_and_reserve_idempotency_key(
  p_user_id uuid,
  p_key_hash text,
  p_expires_at timestamptz default (now() + interval '24 hours')
) returns jsonb
language plpgsql
security definer
as $$
declare
  existing_record public.idempotency_keys%rowtype;
begin
  -- Try to insert the key (atomic check-and-reserve)
  begin
    insert into public.idempotency_keys (user_id, key_hash, expires_at)
    values (p_user_id, p_key_hash, p_expires_at)
    on conflict (user_id, key_hash) do nothing
    returning * into existing_record;

    if found then
      return jsonb_build_object('status', 'available');
    end if;
  exception when others then
    -- If insert failed due to race, fall through to select
  end;

  -- Key already exists - check its state
  select * into existing_record
  from public.idempotency_keys
  where user_id = p_user_id and key_hash = p_key_hash;

  if not found then
    -- Should not happen, but handle gracefully
    return jsonb_build_object('status', 'available');
  end if;

  if existing_record.transaction_id is not null then
    return jsonb_build_object(
      'status', 'duplicate',
      'transaction_id', existing_record.transaction_id
    );
  else
    return jsonb_build_object('status', 'processing');
  end if;
end;
$$;

-- Function to mark idempotency key as completed with transaction_id
create or replace function public.complete_idempotency_key(
  p_user_id uuid,
  p_key_hash text,
  p_transaction_id uuid
) returns void
language plpgsql
security definer
as $$
begin
  update public.idempotency_keys
  set transaction_id = p_transaction_id
  where user_id = p_user_id and key_hash = p_key_hash;
end;
$$;

-- Cleanup function for expired keys (run via cron)
create or replace function public.cleanup_expired_idempotency_keys()
returns integer
language plpgsql
security definer
as $$
declare
  deleted_count integer;
begin
  delete from public.idempotency_keys
  where expires_at < now()
  returning 1 into deleted_count;

  return coalesce(deleted_count, 0);
end;
$$;

-- Grant execute to authenticated for the check/reserve function
grant execute on function public.check_and_reserve_idempotency_key to authenticated;
grant execute on function public.complete_idempotency_key to authenticated;

commit;