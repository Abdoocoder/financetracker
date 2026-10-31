-- ============================================================================
-- neon-clerk-schema.sql
--
-- Converts "user id" columns in the Neon standby database from Supabase's
-- uuid auth.users.id to Clerk's text user id (`user_...`), and rebuilds RLS
-- policies against the Clerk JWT `sub` claim.
--
-- RUN MANUALLY in the Neon SQL Editor. Not a Supabase migration: Neon is the
-- restored standby (see lib/db/neon.ts). Never run this against the Supabase
-- project: GoTrue still issues uuid identities there, so dropping the signup
-- trigger and converting profiles.id to text would break signup for current
-- users. Cut Neon over only after the app has moved to Clerk.
--
-- ---------------------------------------------------------------------------
-- TAKE A NEON BRANCH OR SNAPSHOT FIRST.
-- This is a one-way conversion: `text -> uuid` cannot be reversed for Clerk
-- ids (`user_2abc...` is not a UUID), and dropped policies/views are rebuilt
-- from the backup tables in `_clerk_migration`, not from the original DDL.
-- ---------------------------------------------------------------------------
--
-- What it does
--   1. Creates an `auth` schema shim: auth.jwt() (reads request.jwt.claims),
--      so RLS and RPC bodies keep working without GoTrue/PostgREST.
--   2. Ensures the anon/authenticated/service_role roles exist (PostgREST
--      `SET ROLE` targets). No BYPASSRLS — that needs superuser.
--   3. Discovers the ownership columns to convert:
--        * every public.*.user_id of type uuid
--        * public.profiles.id, public.user_stats.id
--        * any other public uuid column that is an FK to auth.users
--   4. Backs up affected policies, views and FK constraints.
--   5. Drops them (ALTER COLUMN TYPE fails while they reference the column).
--   6. ALTER COLUMN ... TYPE text USING col::text.
--   7. Replaces a uuid-returning auth.uid() with a text one. This has to happen
--      after the policies are gone, because they depend on the function; on a
--      restored Supabase standby the old auth.uid() returns uuid and would make
--      every text comparison fail.
--   8. Restores FKs and views, then recreates every policy with `auth.uid()`
--      rewritten to `(auth.jwt() ->> 'sub')::text`.
--   9. Drops the legacy `on_auth_user_created` trigger if auth.users exists.
--  10. Prints a verification report.
--
-- NOT handled here (must be done separately — this script only unblocks the
-- schema, it does not make Clerk users own their existing rows):
--   * Existing rows still hold Supabase UUIDs. Clerk users will match ZERO
--     rows until an identity map (old uuid -> Clerk sub) is backfilled.
--   * RPCs with `p_user_id uuid` parameters must be redefined to take text.
--     Until then, calling them from the app raises "function does not exist"
--     for the uuid signature.
--   * The app must keep pointing at Supabase PostgREST, not Neon, until Neon
--     has a Data API. See lib/db/neon.ts.
-- ============================================================================

begin;

-- Fail fast instead of blocking writers indefinitely on the standby.
set local lock_timeout = '30s';
set local search_path = public, pg_temp;

create schema if not exists _clerk_migration;

-- ---------------------------------------------------------------------------
-- 1. auth schema shim
-- ---------------------------------------------------------------------------
create schema if not exists auth;

-- Supabase's auth.jwt() reads the claim set PostgREST injects per request.
-- On Neon the same GUC can be set by whatever fronts the database later
-- (PostgREST, a proxy in Edge Functions, or SET LOCAL in a psql session).
create or replace function auth.jwt()
returns jsonb
language sql
stable
as $fn$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), ''),
    '{}'
  )::jsonb;
$fn$;

comment on function auth.jwt() is
  'Clerk-cutover shim: JWT claims from the request.jwt.claims GUC ({} when unset).';

-- ---------------------------------------------------------------------------
-- 2. PostgREST roles
-- ---------------------------------------------------------------------------
do $do$
declare
  r text;
begin
  foreach r in array array['anon', 'authenticated', 'service_role'] loop
    if not exists (select 1 from pg_roles where rolname = r) then
      -- NOLOGIN/NOINHERIT: these are SET ROLE targets, not login accounts.
      execute format('create role %I nologin noinherit', r);
      raise notice 'created role %', r;
    end if;
  end loop;
end
$do$;

-- Let API roles resolve auth.jwt() in policies and RPC bodies. auth.uid() is
-- created in step 7, once the policies that depend on the old one are dropped.
do $do$
declare
  r text;
begin
  foreach r in array array['anon', 'authenticated', 'service_role'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('grant usage on schema auth to %I', r);
      execute format('grant execute on function auth.jwt() to %I', r);
    end if;
  end loop;
end
$do$;

-- ---------------------------------------------------------------------------
-- 3. Discover the columns to convert
-- ---------------------------------------------------------------------------
create table if not exists _clerk_migration.target_columns (
  schema_name text not null,
  table_name  text not null,
  column_name text not null,
  primary key (schema_name, table_name, column_name)
);
truncate _clerk_migration.target_columns;

-- Ownership columns by name. `user_id` is the convention across all 29 tables;
-- profiles.id and user_stats.id ARE the user id and are not named user_id.
insert into _clerk_migration.target_columns (schema_name, table_name, column_name)
select c.table_schema, c.table_name, c.column_name
from information_schema.columns c
join information_schema.tables t
  on t.table_schema = c.table_schema
 and t.table_name   = c.table_name
where c.table_schema = 'public'
  and t.table_type = 'BASE TABLE'
  and c.data_type = 'uuid'
  and (
        c.column_name = 'user_id'
     or (c.table_name = 'profiles'   and c.column_name = 'id')
     or (c.table_name = 'user_stats' and c.column_name = 'id')
  );

-- Any other uuid column that is an FK to auth.users (catches prod-only tables
-- using a different name, e.g. owner_id).
insert into _clerk_migration.target_columns (schema_name, table_name, column_name)
select distinct ns.nspname, rel.relname, a.attname
from pg_constraint con
join pg_class     rel on rel.oid = con.conrelid
join pg_namespace ns  on ns.oid  = rel.relnamespace
join pg_class     frel on frel.oid = con.confrelid
join pg_namespace fns  on fns.oid  = frel.relnamespace
cross join lateral unnest(con.conkey) as k(attnum)
join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.attnum
where con.contype = 'f'
  and ns.nspname   = 'public'
  and fns.nspname  = 'auth'
  and frel.relname = 'users'
  and a.atttypid   = 'uuid'::regtype
  and rel.relkind  = 'r'
on conflict do nothing;

do $do$
declare
  n integer;
begin
  select count(*) into n from _clerk_migration.target_columns;
  if n = 0 then
    raise warning
      'No uuid ownership columns found — already converted, or connected to the wrong database.';
  else
    raise notice 'converting % ownership column(s)', n;
  end if;
end
$do$;

-- ---------------------------------------------------------------------------
-- 4. Back up policies, views and FKs before touching them
-- ---------------------------------------------------------------------------
create table if not exists _clerk_migration.policy_backup (
  id          bigserial   primary key,
  schema_name text        not null,
  table_name  text        not null,
  policy_name text        not null,
  permissive  text        not null,
  roles       name[]      not null,
  cmd         text        not null,
  qual        text,
  with_check  text
);
truncate _clerk_migration.policy_backup restart identity;

insert into _clerk_migration.policy_backup
  (schema_name, table_name, policy_name, permissive, roles, cmd, qual, with_check)
select p.schemaname, p.tablename, p.policyname, p.permissive, p.roles, p.cmd, p.qual, p.with_check
from pg_policies p
join _clerk_migration.target_columns tc
  on tc.schema_name = p.schemaname
 and tc.table_name  = p.tablename
order by p.schemaname, p.tablename, p.policyname;

create table if not exists _clerk_migration.view_backup (
  view_oid    oid        primary key,
  schema_name text       not null,
  view_name   text       not null,
  kind        "char"     not null,   -- 'v' plain view, 'm' materialized view
  definition  text       not null,
  reloptions  text[],
  restored    boolean    not null default false
);
truncate _clerk_migration.view_backup;

-- Views/rules that read a converted column block ALTER COLUMN TYPE.
insert into _clerk_migration.view_backup
  (view_oid, schema_name, view_name, kind, definition, reloptions)
select v.oid, n.nspname, v.relname, v.relkind, pg_get_viewdef(v.oid, true), v.reloptions
from pg_class v
join pg_namespace n on n.oid = v.relnamespace
where v.relkind in ('v', 'm')
  and n.nspname = 'public'
  and exists (
    select 1
    from pg_rewrite r
    join pg_depend d
      on d.classid    = 'pg_rewrite'::regclass
     and d.objid      = r.oid
     and d.refclassid = 'pg_class'::regclass
    join pg_class     t  on t.oid  = d.refobjid
    join pg_namespace tn on tn.oid = t.relnamespace
    join pg_attribute a  on a.attrelid = t.oid and a.attnum = d.refobjsubid
    join _clerk_migration.target_columns tc
      on tc.schema_name = tn.nspname
     and tc.table_name  = t.relname
     and tc.column_name = a.attname
    where r.ev_class = v.oid
  );

create table if not exists _clerk_migration.fk_backup (
  id              bigserial primary key,
  schema_name     text      not null,
  table_name      text      not null,
  constraint_name text      not null,
  definition      text      not null
);
truncate _clerk_migration.fk_backup restart identity;

-- FKs with a converted column on either side (child user_id -> profiles.id, or
-- profiles.id -> auth.users.id).
insert into _clerk_migration.fk_backup
  (schema_name, table_name, constraint_name, definition)
select distinct ns.nspname, rel.relname, con.conname, pg_get_constraintdef(con.oid, true)
from pg_constraint con
join pg_class     rel on rel.oid = con.conrelid
join pg_namespace ns  on ns.oid  = rel.relnamespace
where con.contype = 'f'
  and ns.nspname = 'public'
  and (
    exists (
      select 1
      from unnest(con.conkey) as k(attnum)
      join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.attnum
      join _clerk_migration.target_columns tc
        on tc.schema_name = ns.nspname
       and tc.table_name  = rel.relname
       and tc.column_name = a.attname
    )
    or exists (
      select 1
      from unnest(con.confkey) as k(attnum)
      join pg_attribute  a    on a.attrelid = con.confrelid and a.attnum = k.attnum
      join pg_class      frel on frel.oid   = con.confrelid
      join pg_namespace  fns  on fns.oid    = frel.relnamespace
      join _clerk_migration.target_columns tc
        on tc.schema_name = fns.nspname
       and tc.table_name  = frel.relname
       and tc.column_name = a.attname
    )
  )
order by 1, 2, 3;

do $do$
declare
  np integer;
  nv integer;
  nf integer;
begin
  select count(*) into np from _clerk_migration.policy_backup;
  select count(*) into nv from _clerk_migration.view_backup;
  select count(*) into nf from _clerk_migration.fk_backup;
  raise notice 'backed up % policy(ies), % view(s), % FK constraint(s)', np, nv, nf;
end
$do$;

-- ---------------------------------------------------------------------------
-- 5. Drop what blocks ALTER COLUMN TYPE
-- ---------------------------------------------------------------------------
-- 5a. Policies: "cannot alter type of a column used in a policy definition".
do $do$
declare
  r record;
begin
  for r in
    select schema_name, table_name, policy_name
    from _clerk_migration.policy_backup
    order by schema_name, table_name, policy_name
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      r.policy_name, r.schema_name, r.table_name
    );
  end loop;
end
$do$;

-- 5b. Views: "cannot alter type of a column used by a view or rule".
-- CASCADE is safe: every view that depends on a converted column is backed up.
do $do$
declare
  r record;
begin
  for r in select * from _clerk_migration.view_backup loop
    if r.kind = 'm' then
      execute format('drop materialized view if exists %I.%I cascade', r.schema_name, r.view_name);
    else
      execute format('drop view if exists %I.%I cascade', r.schema_name, r.view_name);
    end if;
  end loop;
end
$do$;

-- 5c. FKs on either side of a converted column.
do $do$
declare
  r record;
begin
  for r in select * from _clerk_migration.fk_backup order by id loop
    execute format(
      'alter table %I.%I drop constraint if exists %I',
      r.schema_name, r.table_name, r.constraint_name
    );
  end loop;
end
$do$;

-- ---------------------------------------------------------------------------
-- 6. Convert uuid -> text
-- ---------------------------------------------------------------------------
do $do$
declare
  r record;
begin
  for r in
    select schema_name, table_name, column_name
    from _clerk_migration.target_columns
    order by schema_name, table_name, column_name
  loop
    -- Re-check the live type: this makes a re-run of the script a no-op.
    if (
      select a.atttypid
      from pg_attribute a
      where a.attrelid = format('%I.%I', r.schema_name, r.table_name)::regclass
        and a.attname  = r.column_name
        and not a.attisdropped
    ) = 'uuid'::regtype then
      execute format(
        'alter table %I.%I alter column %I type text using %I::text',
        r.schema_name, r.table_name, r.column_name, r.column_name
      );
      raise notice 'converted %.%.% to text', r.schema_name, r.table_name, r.column_name;
    end if;
  end loop;
end
$do$;

-- ---------------------------------------------------------------------------
-- 7. auth.uid(): make it exist and return text
-- ---------------------------------------------------------------------------
-- Runs only now, because on a restored Supabase standby auth.uid() returns uuid
-- and cannot be dropped while policies reference it. SQL-language RPC bodies
-- also carry a dependency and will still block the drop — if that happens the
-- script aborts with the offending routine named, which is correct: those RPCs
-- take `p_user_id uuid` and must be rewritten before the type change anyway.
do $do$
declare
  ret     text;
  dep     text;
begin
  if to_regprocedure('auth.uid()') is null then
    execute $fn$
      create function auth.uid()
      returns text
      language sql
      stable
      as $body$
        select nullif(auth.jwt() ->> 'sub', '')
      $body$;
    $fn$;
    raise notice 'created auth.uid() returning text (Clerk sub claim)';

  else
    ret := pg_get_function_result('auth.uid()'::regprocedure);

    if ret = 'text' then
      raise notice 'auth.uid() already returns text — left as is';

    else
      begin
        execute 'drop function auth.uid()';
      exception
        when dependent_objects_still_exist then
          select string_agg(p.oid::regprocedure::text, ', ')
            into dep
            from pg_depend d
            join pg_proc p on p.oid = d.objid
           where d.refclassid = 'pg_proc'::regclass
             and d.refobjid   = 'auth.uid()'::regprocedure
             and d.deptype    = 'n';

          raise exception
            'auth.uid() returns % and cannot be replaced: depended on by [%]. '
            'Rewrite those SQL-language functions to compare text (p_user_id text) '
            'and re-run. This script will not convert half the schema.',
            ret, coalesce(dep, 'unknown');
      end;

      execute $fn$
        create function auth.uid()
        returns text
        language sql
        stable
        as $body$
          select nullif(auth.jwt() ->> 'sub', '')
        $body$;
      $fn$;
      raise notice 'replaced uuid-returning auth.uid() with a text version';
    end if;
  end if;

  -- Re-grant: a provider role recreated above may lack EXECUTE.
  execute 'grant execute on function auth.uid() to public';
end
$do$;

-- ---------------------------------------------------------------------------
-- 8. Restore FK constraints that are still type-compatible
-- ---------------------------------------------------------------------------
-- profiles.id -> auth.users.id is now text -> uuid and gets skipped with a
-- notice. That is deliberate: Neon has no GoTrue, so there is no auth.users to
-- cascade from. Re-create those against Clerk's user table (or drop them for
-- good) when the Neon Data API is wired up.
do $do$
declare
  r record;
begin
  for r in select * from _clerk_migration.fk_backup order by id loop
    begin
      execute format(
        'alter table %I.%I add constraint %I %s',
        r.schema_name, r.table_name, r.constraint_name, r.definition
      );
    exception
      when datatype_mismatch then
        raise notice
          'skipped FK %.% (%): type mismatch (likely references auth.users.id, still uuid)',
          r.schema_name, r.table_name, r.constraint_name;
    end;
  end loop;
end
$do$;

-- ---------------------------------------------------------------------------
-- 9. Restore views
-- ---------------------------------------------------------------------------
-- Views can depend on each other, so retry until a pass creates nothing new.
do $do$
declare
  r            record;
  created_any  boolean;
  opts         text;
  remaining    text;
begin
  loop
    created_any := false;

    for r in
      select * from _clerk_migration.view_backup
      where restored = false
      order by schema_name, view_name
    loop
      begin
        opts := case
                  when r.reloptions is null or array_length(r.reloptions, 1) is null then ''
                  else ' with (' || array_to_string(r.reloptions, ', ') || ')'
                end;

        if r.kind = 'm' then
          execute format(
            'create materialized view %I.%I%s as %s',
            r.schema_name, r.view_name, opts, r.definition
          );
        else
          execute format(
            'create view %I.%I%s as %s',
            r.schema_name, r.view_name, opts, r.definition
          );
        end if;

        update _clerk_migration.view_backup
           set restored = true
         where view_oid = r.view_oid;

        created_any := true;
        raise notice 'restored view %.%', r.schema_name, r.view_name;
      exception
        when others then
          -- Probably a dependency created later in this pass; retry next loop.
          null;
      end;
    end loop;

    exit when not created_any;
  end loop;

  select string_agg(schema_name || '.' || view_name, ', ')
    into remaining
    from _clerk_migration.view_backup
   where restored = false;

  if remaining is not null then
    raise exception
      'could not restore view(s): %. Inspect _clerk_migration.view_backup.definition.',
      remaining;
  end if;
end
$do$;

-- Materialized views need their indexes/policies rebuilt by hand if any
-- existed; pg_get_viewdef does not capture them. None are in the current
-- schema (only monthly_summary and debt_summary, both plain views).

-- ---------------------------------------------------------------------------
-- 10. Recreate policies against the Clerk `sub` claim
-- ---------------------------------------------------------------------------
do $do$
declare
  r             record;
  v_qual        text;
  v_check       text;
  roles_sql     text;
  missing_roles text;
  stmt          text;
begin
  for r in select * from _clerk_migration.policy_backup order by id loop
    -- Refuse to silently fall back to PUBLIC if a named role vanished.
    select string_agg(role_name, ', ')
      into missing_roles
      from unnest(r.roles) as role_name
     where role_name <> 'public'
       and not exists (select 1 from pg_roles where rolname = role_name);

    if missing_roles is not null then
      raise exception
        'policy %.% (%) references missing role(s): %',
        r.schema_name, r.table_name, r.policy_name, missing_roles;
    end if;

    select string_agg(
             case when role_name = 'public' then 'public' else quote_ident(role_name) end,
             ', '
           )
      into roles_sql
      from unnest(r.roles) as role_name;

    -- Clerk puts the user id in `sub`; auth.uid() has no GoTrue to read from.
    -- Wrapping in (select ...) keeps the initplan-once shape of
    -- `(select auth.uid()) = user_id`, which the RLS perf migrations added.
    v_qual  := replace(r.qual,       'auth.uid()', '(auth.jwt() ->> ''sub'')::text');
    v_check := replace(r.with_check, 'auth.uid()', '(auth.jwt() ->> ''sub'')::text');

    stmt := format(
      'create policy %I on %I.%I as %s for %s to %s%s%s',
      r.policy_name,
      r.schema_name,
      r.table_name,
      case when r.permissive = 'RESTRICTIVE' then 'restrictive' else 'permissive' end,
      r.cmd,
      roles_sql,
      case when v_qual  is not null then ' using ('      || v_qual  || ')' else '' end,
      case when v_check is not null then ' with check (' || v_check || ')' else '' end
    );

    execute stmt;
  end loop;

  raise notice 'recreated % policies', (select count(*) from _clerk_migration.policy_backup);
end
$do$;

-- ---------------------------------------------------------------------------
-- 11. Legacy GoTrue signup trigger
-- ---------------------------------------------------------------------------
-- public.handle_new_user() inserts new.id (uuid) into profiles.id (now text),
-- so the trigger would fail on every signup. Neon has no auth.users at all.
do $do$
begin
  if to_regclass('auth.users') is not null then
    execute 'drop trigger if exists on_auth_user_created on auth.users';
    raise notice 'dropped legacy on_auth_user_created trigger';
  else
    raise notice 'auth.users does not exist on this database — no signup trigger to drop';
  end if;
end
$do$;

-- ---------------------------------------------------------------------------
-- 12. Verification
-- ---------------------------------------------------------------------------
-- 12a. Anything still typed uuid that looks like an ownership column.
select c.table_schema, c.table_name, c.column_name, c.data_type
from information_schema.columns c
where c.table_schema = 'public'
  and c.column_name in ('user_id', 'id')
  and c.data_type = 'uuid'
  and c.table_name in ('profiles', 'user_stats')
order by 1, 2, 3;

-- 12b. Policies on tables that were NOT converted but still call auth.uid().
--     After step 7 auth.uid() returns text, so these compare text to a uuid
--     column and error at query time. Expect zero rows on the current schema.
select schemaname, tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and (qual like '%auth.uid()%' or with_check like '%auth.uid()%')
order by 1, 2, 3;

-- 12c. The converted ownership columns, so the identity backfill can be sized.
select tc.table_name, tc.column_name
from _clerk_migration.target_columns tc
order by 1, 2;

select
  (select count(*) from _clerk_migration.target_columns) as converted_columns,
  (select count(*) from _clerk_migration.policy_backup)  as restored_policies,
  (select count(*) from _clerk_migration.view_backup where restored) as restored_views,
  (select count(*) from _clerk_migration.fk_backup)      as attempted_fks;

commit;

-- ============================================================================
-- After this commits, before any Clerk user can see their data:
--   1. identity map: build old_uuid -> clerk_sub, then UPDATE every converted
--      column. Nothing will match RLS until this exists.
--   2. RPCs: redefine `p_user_id uuid` parameters as text. Search with
--        select p.proname, pg_get_function_arguments(p.oid)
--        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--        where n.nspname = 'public' and pg_get_function_arguments(p.oid) like '%uuid%';
--   3. Reconnect PostgREST (or the Neon Data API) with
--        db-schemas = "public", db-pre-request = '', db-role-claim-key = '.role',
--      and the Clerk JWT secret so request.jwt.claims is populated.
-- ============================================================================
