-- =============================================
-- 043_user_byok_keys.sql
-- BYOK key METADATA ONLY (Feature A, AD-3 "Zero-Server Storage").
--
-- Provider API keys are NEVER stored here — the server never holds a key.
-- Per AD-3 the raw key is encrypted in the BROWSER (Web Crypto AES-GCM,
-- non-extractable) and the ciphertext lives in the browser's IndexedDB
-- vault (lib/byok/vault.ts), keyed by this row's `id`.
--
-- This table therefore stores only display/rotation metadata:
--   * key_prefix  — first chars of the key, for display only
--   * is_active   — soft-enable/disable for the chat picker
--   * last_used_at — stamped by the settings "Test key" + chat page
--
-- Same conventions as 039_user_api_keys / 041_chats:
--   * user_id references public.profiles(id) on delete cascade
--   * RLS enforced, owner = auth.uid()
--   * explicit grant to `authenticated` (PostgREST requires it since
--     the 2026-04-28 breaking change, enforced everywhere 2026-10-30)
-- =============================================

create table if not exists public.user_byok_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider_id text not null,          -- one of SUPPORTED_PROVIDERS ids
  key_name text not null,
  key_prefix text not null,           -- display only (e.g. "sk-ant-1234...")
  is_active boolean not null default true,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

-- Inbox-style listing (settings page) + fast per-user lookups
create index if not exists idx_user_byok_keys_user_created
  on public.user_byok_keys(user_id, created_at desc);

create index if not exists idx_user_byok_keys_provider
  on public.user_byok_keys(provider_id);

-- RLS: users only ever touch their OWN key metadata
alter table public.user_byok_keys enable row level security;

create policy "Users view own byok keys" on public.user_byok_keys
  for select using (auth.uid() = user_id);

create policy "Users insert own byok keys" on public.user_byok_keys
  for insert with check (auth.uid() = user_id);

create policy "Users update own byok keys" on public.user_byok_keys
  for update using (auth.uid() = user_id);

create policy "Users delete own byok keys" on public.user_byok_keys
  for delete using (auth.uid() = user_id);

-- Explicit grant for the Data API (see header comment)
grant select, insert, update, delete on public.user_byok_keys to authenticated;