-- =============================================
-- USER API KEYS — external integration access
-- Allows third-party AI assistants to create
-- transactions via webhook without Supabase Auth
-- =============================================

create table public.user_api_keys (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  key_hash text not null,
  key_prefix text not null,
  scopes jsonb not null default '["create_transaction"]'::jsonb,
  rate_limit_per_min int not null default 10,
  is_active boolean not null default true,
  last_used_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz default now()
);

-- Fast lookup by key hash
create index idx_user_api_keys_hash on public.user_api_keys (key_hash) where is_active = true;

-- User can see their own keys
alter table public.user_api_keys enable row level security;

create policy "Users own api keys" on public.user_api_keys
  for all using ((select auth.uid()) = user_id);

-- =============================================
-- API AUDIT LOG — tracks all external API usage
-- =============================================

create table public.api_audit_log (
  id uuid default uuid_generate_v4() primary key,
  api_key_id uuid references public.user_api_keys(id) on delete set null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  action text not null,
  payload jsonb,
  ip text,
  user_agent text,
  created_at timestamptz default now()
);

-- Query by key + time for rate limiting and audit
create index idx_api_audit_log_key_time on public.api_audit_log (api_key_id, created_at desc);

-- Query by user + time for dashboard display
create index idx_api_audit_log_user_time on public.api_audit_log (user_id, created_at desc);

-- User can see their own audit logs
alter table public.api_audit_log enable row level security;

create policy "Users own audit logs" on public.api_audit_log
  for all using ((select auth.uid()) = user_id);
