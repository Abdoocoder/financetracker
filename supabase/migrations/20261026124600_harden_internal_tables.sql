-- Migration: 20261026124600_harden_internal_tables.sql
-- (Originally authored locally as 20261026000001_harden_internal_tables.sql;
--  the Supabase management API recorded it under its own apply timestamp,
--  2026-10-26 12:46:00 UTC, which this filename now matches.)
-- Purpose: stop end users from mutating their own internal bookkeeping rows.
--
-- VERIFIED against prod (fajrak, project ujwcvtpwsaidljecqbaa) on 2026-10-26
-- before this file was written. Live state was:
--
--   table             policy name                cmd  qual
--   api_audit_log     "Users own audit logs"      ALL  auth.uid() = user_id
--   proxy_usage       "Users own proxy usage"     ALL  auth.uid() = user_id
--   idempotency_keys  "Users own idempotency_keys" ALL auth.uid() = user_id
--
--   public.bump_proxy_usage() -> int
--     identity args: (none)              <-- NOT bump_proxy_usage(uuid)
--     prosecdef:     false               <-- SECURITY INVOKER
--     proconfig:     search_path=public
--
--   authenticated held INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER on all
--   three tables. `anon` held nothing.
--
-- Why this matters:
--   * api_audit_log is the API tamper-evidence trail. UPDATE/DELETE lets a user
--     erase the record of their own key usage.
--   * proxy_usage is the BYOK rate-limit counter. UPDATE lets a user reset their
--     own bucket to 0 and bypass the 30 req/min cap entirely.
--   * idempotency_keys backs create_transaction de-duplication. UPDATE/DELETE
--     lets a user re-open a reserved key and double-create a transaction.
--
-- Grants and RLS are independent gates: the FOR ALL policies were already
-- row-scoped to auth.uid(), so the actual hole was the table-level write grant.
-- Revoking the grants is the fix; policies are narrowed as defence in depth.

begin;

-- ── api_audit_log ─────────────────────────────────────────────────────────
-- Append-only for users: they may read and write their own rows, but never
-- rewrite or erase history.
revoke update, delete, truncate, references, trigger
  on public.api_audit_log from authenticated;

drop policy if exists "Users own audit logs" on public.api_audit_log;

create policy "Users own audit logs" on public.api_audit_log
  for select using ((select auth.uid()) = user_id);

-- INSERT is deliberately preserved. The BYOK agent route writes audit rows
-- with the caller's session client (app/api/byok/agent/route.ts calls
-- writeAuditLog(..., { client: supabase })), so a SELECT-only policy would
-- leave no INSERT policy and silently stop those writes — the error is caught
-- and console.error'd, never surfaced.
drop policy if exists "Users insert own audit logs" on public.api_audit_log;

create policy "Users insert own audit logs" on public.api_audit_log
  for insert with check ((select auth.uid()) = user_id);

-- ── proxy_usage ───────────────────────────────────────────────────────────
-- Read-only for users. The counter is written exclusively by
-- bump_proxy_usage(); `revoke all` + a single SELECT grant also drops the
-- inherited TRUNCATE/REFERENCES/TRIGGER privileges.
revoke all on public.proxy_usage from authenticated;
grant select on public.proxy_usage to authenticated;

-- Table-level INSERT/UPDATE are gone from `authenticated`, so the counter
-- function must run with the table owner's privileges — SECURITY DEFINER.
--
-- This is safe specifically because the function takes NO arguments and always
-- resolves the row from auth.uid(): a caller can only ever increment their own
-- bucket, and cannot name another user. (auth.uid() reads the request GUCs, so
-- it still returns the *caller's* id under SECURITY DEFINER.) search_path was
-- already pinned and is kept pinned.
create or replace function public.bump_proxy_usage()
returns int
language sql
security definer
set search_path = public
as $$
  insert into public.proxy_usage (user_id, minute_bucket, count)
  values ((select auth.uid()), date_trunc('minute', now()), 1)
  on conflict (user_id, minute_bucket)
  do update set count = public.proxy_usage.count + 1
  returning count;
$$;

-- Functions inherit EXECUTE from PUBLIC, so revoking from anon alone is not
-- enough (same trap documented in 20261018000000_linter_security_hardening).
revoke execute on function public.bump_proxy_usage() from public, anon;
grant execute on function public.bump_proxy_usage() to authenticated, service_role;

-- ── idempotency_keys ──────────────────────────────────────────────────────
-- Users may read and reserve, never rewrite or erase. Reservation and
-- completion run through check_and_reserve_idempotency_key() and
-- complete_idempotency_key(), both SECURITY DEFINER, so they are unaffected.
revoke update, delete, truncate, references, trigger
  on public.idempotency_keys from authenticated;

-- ── assertions ────────────────────────────────────────────────────────────
do $$
declare
  v_count int;
begin
  -- No dangerous write grants left on any of the three tables.
  select count(*) into v_count
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in ('api_audit_log', 'proxy_usage', 'idempotency_keys')
    and grantee = 'authenticated'
    and privilege_type in ('UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER');

  if v_count > 0 then
    raise exception 'authenticated still holds % write grant(s) on internal tables', v_count;
  end if;

  -- proxy_usage must be SELECT-only for users.
  select count(*) into v_count
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name = 'proxy_usage'
    and grantee = 'authenticated'
    and privilege_type <> 'SELECT';

  if v_count > 0 then
    raise exception 'authenticated still holds % non-SELECT grant(s) on proxy_usage', v_count;
  end if;

  -- SELECT must survive on all three (RLS still scopes it to the owner).
  select count(*) into v_count
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in ('api_audit_log', 'proxy_usage', 'idempotency_keys')
    and grantee = 'authenticated'
    and privilege_type = 'SELECT';

  if v_count <> 3 then
    raise exception 'authenticated lost SELECT on an internal table (found %)', v_count;
  end if;

  -- The session-client audit write path must keep working.
  select count(*) into v_count
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name = 'api_audit_log'
    and grantee = 'authenticated'
    and privilege_type = 'INSERT';

  if v_count <> 1 then
    raise exception 'authenticated lost INSERT on api_audit_log';
  end if;

  -- Counter function must be callable and must be SECURITY DEFINER.
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'bump_proxy_usage'
      and p.prosecdef
      and pg_get_function_identity_arguments(p.oid) = ''
  ) then
    raise exception 'bump_proxy_usage() is not a zero-argument SECURITY DEFINER function';
  end if;
end $$;

commit;
