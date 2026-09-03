-- =============================================
-- PROXY USAGE — per-user rate limiting for
-- the BYOK LLM proxy (/api/byok/proxy, Feature A)
-- Decision: AD-5 in docs/projects/llm-ecosystem_prd.md
-- =============================================
-- Design notes (per AD-5):
--   * Atomic per-user counter. One row per (user, minute).
--   * The counter naturally resets each minute because a NEW bucket
--     row (different minute_bucket) is created; old buckets are
--     cleaned up periodically using idx_proxy_usage_minute_bucket.
--   * In-process / shared-nothing counters are FORBIDDEN here —
--     stateless serverless has one instance per invocation, so a
--     local counter would be silently wrong.
--   * RLS ensures a user can only touch their OWN bucket.
--   * Increment is done inside bump_proxy_usage() so we get the real
--     atomic "count = count + 1" (PostgREST .upsert() cannot express
--     a mutating DO UPDATE expression, so this needs a function).

create table public.proxy_usage (
  user_id uuid references public.profiles(id) on delete cascade not null,
  minute_bucket timestamptz not null,          -- date_trunc('minute', now())
  count int not null default 0,
  primary key (user_id, minute_bucket)
);

-- Support cleanup of expired minute buckets
create index idx_proxy_usage_minute_bucket on public.proxy_usage (minute_bucket);

-- RLS: users can only read/write their own bucket
alter table public.proxy_usage enable row level security;

create policy "Users own proxy usage" on public.proxy_usage
  for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Explicit grant for the Data API.
-- New public-schema tables are NOT auto-exposed to PostgREST since the
-- 2026-04-28 breaking change (enforced on all projects 2026-10-30). The
-- proxy route uses the anon-key + session client (respects RLS), so we
-- grant to `authenticated` only; RLS remains the row-level gate.
grant select, insert, update, delete on public.proxy_usage to authenticated;

-- =============================================
-- ATOMIC INCREMENT FUNCTION (SECURITY INVOKER)
-- =============================================
-- Runs as the invoking role (the authenticated user), so RLS applies.
-- Resolves the user from auth.uid() and can only affect their own rows.
-- Returns the post-increment count so the route can decide 2xx vs 429.
-- SECURITY DEFINER is deliberately NOT used (it would bypass RLS and be
-- callable by anon/authenticated in public).

create or replace function public.bump_proxy_usage()
returns int
language sql
security invoker
set search_path = public
as $$
  insert into public.proxy_usage (user_id, minute_bucket, count)
  values ((select auth.uid()), date_trunc('minute', now()), 1)
  on conflict (user_id, minute_bucket)
  do update set count = public.proxy_usage.count + 1
  returning count;
$$;

-- Function is callable by the authenticated role only (the proxy backs
-- session auth, not anon). RPC does not bypass RLS (invoker).
grant execute on function public.bump_proxy_usage() to authenticated;

-- =============================================
-- KEK (see AD-4) — ENV-ONLY, never stored in the DB
-- =============================================
-- The proxy unwraps the client's per-request envelope with a server-held
-- KEK. Per AD-4 this KEK MUST live in a secret manager / Vercel env
-- (e.g. BYOK_KEK + BYOK_KEK_ID), NOT in a database row or on disk.
-- Because it is a key-management secret and not a stored user LLM key,
-- zero-server-storage (AD-3) is NOT violated by holding it in env.
--
-- Env variables required by the proxy route:
--   BYOK_KEK      = raw 32-byte AES-GCM KEK (base64)  — global for v1
--   BYOK_KEK_ID   = version/key-id tag placed on every wrapped envelope,
--                   enabling additive rotation (old KEK retained until
--                   all fragments are re-wrapped; revocation still works
--                   after rotation).
--
-- No DB object is created for the KEK — see AD-4 for lifecycle/rotation.
