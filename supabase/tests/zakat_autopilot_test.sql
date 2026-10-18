-- ============================================================================
-- Verification harness for the Zakat Autopilot (supabase/migrations/20261021000000)
--
-- Purpose: proves the Hawl state machine exposed by
--   public.sync_zakat_haul_state(p_user_id, p_gold_price, p_silver_price, p_fx_rate)
-- behaves as declared in migration 20261021000000:
--   a) below Nisab            -> tracking row exists, clock stays NULL.
--   b) crosses Nisab          -> nisab_reached_at + current_haul_due_at set,
--                                due = reached + 354 days, days_remaining 354.
--   c) still above Nisab      -> the clock is NOT restarted (Hawl continuity;
--                                verified by aging the row and re-syncing).
--   d) drops below Nisab      -> both timestamps reset to NULL (Hawl breaks),
--                                last_notified_at left untouched (the upsert
--                                only writes the two clock columns).
--   e) service_role (NULL uid)-> may sync any user (cron path).
--   f) mismatched authenticated uid -> RAISEs 'Not authorized'.
--   g) schema: RLS on, SELECT-only policy for clients, no write policies,
--      EXECUTE denied to anon/PUBLIC and granted to authenticated +
--      service_role, an index leads user_id, authenticated holds no table
--      privilege beyond SELECT.
--
-- Default prices (same assumptions as zakat_fixtures.sql):
--   gold 30.00/gram, silver 0.35/gram, fx 1.0
--   => effective Nisab = LEAST(85*30, 595*0.35) = 208.25
--
-- Run locally ONLY (never against production):
--   1. supabase db reset        # applies migrations incl. 20261021000000
--   2. psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 \
--        -f supabase/tests/zakat_autopilot_test.sql
--
-- Design: all scratch users are created inside one transaction and rolled
-- back at the end, so the database is left untouched even on success.
-- ============================================================================
\set ON_ERROR_STOP on

do $$
declare
  v_uid            uuid;
  v_result         jsonb;
  v_fail           int := 0;
  v_line           text;

  v_reached_at     timestamptz;
  v_due_at         timestamptz;
  v_aged_reached   timestamptz;
  v_aged_due       timestamptz;

  v_exists         int;
  v_missing        int;
begin
  -- scratch user: inserting into auth.users fires on_auth_user_created,
  -- which creates the matching profiles row automatically.
  v_uid := gen_random_uuid();
  insert into auth.users (id, instance_id, aud, role, email,
                          encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data,
                          created_at, updated_at)
  values (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated',
          'authenticated', 'zakat-autopilot-' || v_uid || '@example.test',
          crypt('test-password-not-real', gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}',
          '{}', now(), now());

  -- seed 100 JOD cash -> below the effective Nisab (208.25)
  insert into public.accounts (user_id, name, type, opening_balance)
  values (v_uid, 'Autopilot Cash', 'cash', 100);

  -- impersonate the user so the owner-verification guard lets the call through
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_uid, 'role', 'authenticated')::text, false);

  -- ============================================================
  -- a) below Nisab -> row upserted, clock stays NULL
  -- ============================================================
  select public.sync_zakat_haul_state(v_uid)::jsonb into v_result;

  if (v_result->>'user_id')::uuid is distinct from v_uid then
    v_fail := v_fail + 1;
    raise notice 'FAIL [a] user_id echo: got %', v_result->>'user_id';
  end if;

  if coalesce((v_result->>'zakatable_assets')::numeric, -1) is distinct from 100 then
    v_fail := v_fail + 1;
    raise notice 'FAIL [a] zakatable_assets: got %, expected 100', v_result->>'zakatable_assets';
  end if;

  if coalesce((v_result->>'nisab_effective')::numeric, -1) is distinct from 208.25 then
    v_fail := v_fail + 1;
    raise notice 'FAIL [a] nisab_effective: got %, expected 208.25', v_result->>'nisab_effective';
  end if;

  if v_result->>'nisab_reached_at' is not null then
    v_fail := v_fail + 1;
    raise notice 'FAIL [a] nisab_reached_at should be NULL below Nisab, got %',
      v_result->>'nisab_reached_at';
  end if;

  if v_result->>'current_haul_due_at' is not null then
    v_fail := v_fail + 1;
    raise notice 'FAIL [a] current_haul_due_at should be NULL below Nisab, got %',
      v_result->>'current_haul_due_at';
  end if;

  if v_result->>'days_remaining' is not null then
    v_fail := v_fail + 1;
    raise notice 'FAIL [a] days_remaining should be NULL below Nisab, got %',
      v_result->>'days_remaining';
  end if;

  if not exists (select 1 from public.zakat_haul_tracking where user_id = v_uid) then
    v_fail := v_fail + 1;
    raise notice 'FAIL [a] no tracking row upserted for below-Nisab user';
  end if;

  raise notice 'PASS [a]: below Nisab -> row upserted, clock NULL';

  -- ============================================================
  -- b) crosses Nisab -> clock starts (reached, reached + 354 days)
  --    100 + 5000 = 5100 >= 208.25; zakat_due = 5100 * 0.025 = 127.5
  -- ============================================================
  insert into public.accounts (user_id, name, type, opening_balance)
  values (v_uid, 'Autopilot Savings', 'cash', 5000);

  select public.sync_zakat_haul_state(v_uid)::jsonb into v_result;

  v_reached_at := (v_result->>'nisab_reached_at')::timestamptz;
  v_due_at     := (v_result->>'current_haul_due_at')::timestamptz;

  if v_reached_at is null then
    v_fail := v_fail + 1;
    raise notice 'FAIL [b] nisab_reached_at should be set above Nisab';
  end if;

  if v_due_at is null then
    v_fail := v_fail + 1;
    raise notice 'FAIL [b] current_haul_due_at should be set above Nisab';
  end if;

  if v_reached_at is not null and v_due_at is not null
     and v_due_at - v_reached_at is distinct from interval '354 days' then
    v_fail := v_fail + 1;
    raise notice 'FAIL [b] haul length: got %, expected 354 days', v_due_at - v_reached_at;
  end if;

  -- computed inside the RPC transaction, so exactly 354
  if (v_result->>'days_remaining')::int is distinct from 354 then
    v_fail := v_fail + 1;
    raise notice 'FAIL [b] days_remaining: got %, expected 354', v_result->>'days_remaining';
  end if;

  if abs(coalesce((v_result->>'zakat_due')::numeric, -1) - 127.5) > 0.01 then
    v_fail := v_fail + 1;
    raise notice 'FAIL [b] zakat_due: got %, expected 127.5', v_result->>'zakat_due';
  end if;

  if coalesce((v_result->>'is_eligible')::boolean, false) is distinct from true then
    v_fail := v_fail + 1;
    raise notice 'FAIL [b] is_eligible should be true';
  end if;

  raise notice 'PASS [b]: above Nisab -> clock started (reached, +354 days)';

  -- ============================================================
  -- c) Hawl continuity: an already-running clock must NOT restart.
  --    Age the row by hand (200 days elapsed -> 154 remaining) and re-sync.
  -- ============================================================
  v_aged_reached := now() - interval '200 days';
  v_aged_due     := v_aged_reached + interval '354 days';
  update public.zakat_haul_tracking
    set nisab_reached_at = v_aged_reached, current_haul_due_at = v_aged_due
    where user_id = v_uid;

  select public.sync_zakat_haul_state(v_uid)::jsonb into v_result;

  if (v_result->>'nisab_reached_at')::timestamptz is distinct from v_aged_reached then
    v_fail := v_fail + 1;
    raise notice 'FAIL [c] nisab_reached_at was restarted: got %, expected %',
      v_result->>'nisab_reached_at', v_aged_reached;
  end if;

  if (v_result->>'current_haul_due_at')::timestamptz is distinct from v_aged_due then
    v_fail := v_fail + 1;
    raise notice 'FAIL [c] current_haul_due_at was restarted: got %, expected %',
      v_result->>'current_haul_due_at', v_aged_due;
  end if;

  if (v_result->>'days_remaining')::int is distinct from 154 then
    v_fail := v_fail + 1;
    raise notice 'FAIL [c] days_remaining: got %, expected 154', v_result->>'days_remaining';
  end if;

  raise notice 'PASS [c]: active Hawl keeps its clock (200 elapsed / 154 left)';

  -- ============================================================
  -- d) drops below Nisab -> clock reset to NULL, last_notified_at kept
  -- ============================================================
  delete from public.accounts where user_id = v_uid;
  update public.zakat_haul_tracking
    set last_notified_at = now()
    where user_id = v_uid;

  select public.sync_zakat_haul_state(v_uid)::jsonb into v_result;

  if v_result->>'nisab_reached_at' is not null then
    v_fail := v_fail + 1;
    raise notice 'FAIL [d] nisab_reached_at should reset to NULL, got %',
      v_result->>'nisab_reached_at';
  end if;

  if v_result->>'current_haul_due_at' is not null then
    v_fail := v_fail + 1;
    raise notice 'FAIL [d] current_haul_due_at should reset to NULL, got %',
      v_result->>'current_haul_due_at';
  end if;

  if v_result->>'days_remaining' is not null then
    v_fail := v_fail + 1;
    raise notice 'FAIL [d] days_remaining should reset to NULL, got %',
      v_result->>'days_remaining';
  end if;

  -- the upsert only writes the two clock columns: the notification stamp survives
  if (v_result->>'last_notified_at')::timestamptz is distinct from now() then
    v_fail := v_fail + 1;
    raise notice 'FAIL [d] last_notified_at should be preserved, got %',
      v_result->>'last_notified_at';
  end if;

  raise notice 'PASS [d]: below Nisab again -> clock reset, last_notified_at preserved';

  -- ============================================================
  -- e) service_role simulation: NULL uid (no JWT claims) may sync
  --    any user (cron path). Setting claims to '' -> auth.uid() NULL.
  -- ============================================================
  perform set_config('request.jwt.claims', '', false);
  begin
    select public.sync_zakat_haul_state(v_uid)::jsonb into v_result;
    if (v_result->>'user_id')::uuid is distinct from v_uid then
      v_fail := v_fail + 1;
      raise notice 'FAIL [e] service_role: unexpected payload %', v_result;
    elsif coalesce((v_result->>'is_eligible')::boolean, true) is not false then
      v_fail := v_fail + 1;
      raise notice 'FAIL [e] service_role: expected is_eligible false, got %',
        v_result->>'is_eligible';
    else
      raise notice 'PASS [e]: NULL uid (service_role) may sync any user';
    end if;
  exception when others then
    v_fail := v_fail + 1;
    raise notice 'FAIL [e] service_role: raised % for NULL uid', sqlerrm;
  end;

  -- ============================================================
  -- f) auth guard: mismatched subject must RAISE
  -- ============================================================
  perform set_config('request.jwt.claims',
    json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, false);
  begin
    v_line := public.sync_zakat_haul_state(v_uid)::text;
    v_fail := v_fail + 1;
    raise notice 'FAIL [f] guard: sync_zakat_haul_state did NOT raise for mismatched user';
  exception when others then
    if sqlerrm like '%Not authorized%' then
      raise notice 'PASS [f]: raises for mismatched user';
    else
      v_fail := v_fail + 1;
      raise notice 'FAIL [f] guard: unexpected error %', sqlerrm;
    end if;
  end;

  -- ============================================================
  -- g) schema assertions
  -- ============================================================
  if not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'zakat_haul_tracking'
      and c.relrowsecurity
  ) then
    v_fail := v_fail + 1;
    raise notice 'FAIL [g] schema: RLS not enabled on zakat_haul_tracking';
  else
    raise notice 'PASS [g]: RLS enabled on zakat_haul_tracking';
  end if;

  select count(*) into v_exists
  from pg_policies
  where schemaname = 'public' and tablename = 'zakat_haul_tracking'
    and cmd = 'SELECT';
  if v_exists is distinct from 1 then
    v_fail := v_fail + 1;
    raise notice 'FAIL [g] schema: expected exactly 1 SELECT policy, got %', v_exists;
  else
    raise notice 'PASS [g]: exactly one SELECT policy present';
  end if;

  select count(*) into v_exists
  from pg_policies
  where schemaname = 'public' and tablename = 'zakat_haul_tracking'
    and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL');
  if v_exists <> 0 then
    v_fail := v_fail + 1;
    raise notice 'FAIL [g] schema: % client write policy(ies) on zakat_haul_tracking', v_exists;
  else
    raise notice 'PASS [g]: no client write policies on zakat_haul_tracking';
  end if;

  -- an index leads user_id (the PK on user_id serves as the FK index)
  if not exists (
    select 1 from pg_index i
    join pg_class t on t.oid = i.indrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public' and t.relname = 'zakat_haul_tracking'
      and i.indkey[0] = (select a.attnum from pg_attribute a
                         where a.attrelid = 'public.zakat_haul_tracking'::regclass
                           and a.attname = 'user_id')
  ) then
    v_fail := v_fail + 1;
    raise notice 'FAIL [g] schema: no index leads zakat_haul_tracking.user_id';
  else
    raise notice 'PASS [g]: user_id is led by an index (PK)';
  end if;

  -- EXECUTE must not reach anon/PUBLIC (NULL acl would also mean PUBLIC default)
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'sync_zakat_haul_state'
      and (p.proacl is null or exists (
        select 1 from aclexplode(p.proacl) a
        join pg_roles r on r.oid = a.grantee
        where r.rolname in ('anon', 'public') and a.privilege_type = 'EXECUTE'))
  ) then
    v_fail := v_fail + 1;
    raise notice 'FAIL [g] grants: anon/PUBLIC can execute sync_zakat_haul_state';
  else
    raise notice 'PASS [g]: EXECUTE denied to anon/PUBLIC';
  end if;

  select count(distinct r.rolname) into v_exists
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  cross join lateral aclexplode(p.proacl) a
  join pg_roles r on r.oid = a.grantee
  where n.nspname = 'public' and p.proname = 'sync_zakat_haul_state'
    and r.rolname in ('authenticated', 'service_role')
    and a.privilege_type = 'EXECUTE';
  if v_exists is distinct from 2 then
    v_fail := v_fail + 1;
    raise notice 'FAIL [g] grants: EXECUTE on sync_zakat_haul_state held by % roles, expected 2',
      v_exists;
  else
    raise notice 'PASS [g]: EXECUTE granted to authenticated + service_role';
  end if;

  -- clients hold no table privilege beyond SELECT
  select count(*) into v_missing
  from information_schema.role_table_grants
  where table_schema = 'public' and table_name = 'zakat_haul_tracking'
    and grantee = 'authenticated' and privilege_type <> 'SELECT';
  if v_missing > 0 then
    v_fail := v_fail + 1;
    raise notice 'FAIL [g] grants: authenticated holds % non-SELECT privilege(s) on the table',
      v_missing;
  else
    raise notice 'PASS [g]: authenticated is SELECT-only on zakat_haul_tracking';
  end if;

  -- ============================================================
  -- Summary + rollback (fixtures never persist)
  -- ============================================================
  raise notice '---------------------------------------------';
  raise notice 'zakat autopilot verification: 7 scenario groups exercised, % failures', v_fail;
  if v_fail > 0 then
    raise exception 'VERIFICATION FAILED (% failures)', v_fail;
  end if;
  raise notice 'ALL CHECKS PASSED';
  raise notice '---------------------------------------------';

  rollback; -- scratch users + tracking rows removed; DB left as found
end $$;
