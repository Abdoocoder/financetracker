-- ============================================================================
-- neon-clerk-backfill.sql
--
-- Backfills the Clerk identity map into all ownership columns after
-- neon-clerk-schema.sql has converted them to text.
--
-- PREREQUISITES (run in this exact order):
--   1. neon-clerk-schema.sql       -- converts uuid->text, rebuilds RLS
--   2. Load identity map:
--        \copy _clerk_migration.identity_map from 'scripts/identity-map.csv' with csv header
--      (or paste the generated INSERT statements into Neon SQL Editor)
--   3. THIS SCRIPT                  -- updates every converted column
--
-- RUN MANUALLY in the Neon SQL Editor. Single transaction, rolls back on error.
-- ============================================================================

begin;

set local lock_timeout = '30s';
set local search_path = public, _clerk_migration, pg_temp;

-- ---------------------------------------------------------------------------
-- 0. Verify the identity map exists and has data
-- ---------------------------------------------------------------------------
do $do$
declare
  n integer;
begin
  select count(*) into n from _clerk_migration.identity_map;
  if n = 0 then
    raise exception 'identity_map is empty. Load scripts/identity-map.csv first.';
  end if;
  raise notice 'identity_map loaded: % rows', n;
end
$do$;

-- ---------------------------------------------------------------------------
-- 1. Temporarily drop FK constraints that reference converted columns
--    We must do this because profiles.id and user_stats.id are PKs,
--    and other tables have FKs pointing to them. We'll update both sides
--    in one transaction, but FKs would block the PK update.
--    neon-clerk-schema.sql already restored compatible FKs in step 8.
-- ---------------------------------------------------------------------------
create temp table _clerk_migration.fk_to_disable (
  id              bigserial primary key,
  schema_name     text      not null,
  table_name      text      not null,
  constraint_name text      not null,
  definition      text      not null
) on commit drop;

insert into _clerk_migration.fk_to_disable
  (schema_name, table_name, constraint_name, definition)
select distinct ns.nspname, rel.relname, con.conname, pg_get_constraintdef(con.oid, true)
from pg_constraint con
join pg_class     rel on rel.oid = con.conrelid
join pg_namespace ns  on ns.oid  = rel.relnamespace
where con.contype = 'f'
  and ns.nspname = 'public'
  and (
    -- FK where child column is a converted column
    exists (
      select 1
      from unnest(con.conkey) as k(attnum)
      join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k.attnum
      join _clerk_migration.target_columns tc
        on tc.schema_name = ns.nspname
       and tc.table_name  = rel.relname
       and tc.column_name = a.attname
    )
    or
    -- FK where parent column is a converted column (profiles.id, user_stats.id)
    exists (
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
  r record;
begin
  for r in select * from _clerk_migration.fk_to_disable order by id loop
    execute format(
      'alter table %I.%I drop constraint if exists %I',
      r.schema_name, r.table_name, r.constraint_name
    );
    raise notice 'dropped FK %.% (%)', r.schema_name, r.table_name, r.constraint_name;
  end loop;
end
$do$;

-- ---------------------------------------------------------------------------
-- 2. Update profiles.id (PK) — this is the anchor for all other tables
-- ---------------------------------------------------------------------------
do $do$
declare
  n integer;
begin
  update public.profiles p
  set id = im.clerk_sub
  from _clerk_migration.identity_map im
  where p.id = im.old_uuid;
  get diagnostics n = row_count;
  raise notice 'updated profiles.id: % rows', n;
end
$do$;

-- ---------------------------------------------------------------------------
-- 3. Update user_stats.id (PK)
-- ---------------------------------------------------------------------------
do $do$
declare
  n integer;
begin
  update public.user_stats u
  set id = im.clerk_sub
  from _clerk_migration.identity_map im
  where u.id = im.old_uuid;
  get diagnostics n = row_count;
  raise notice 'updated user_stats.id: % rows', n;
end
$do$;

-- ---------------------------------------------------------------------------
-- 4. Update all other ownership columns (user_id, and any other discovered)
--    Uses the target_columns table populated by neon-clerk-schema.sql
-- ---------------------------------------------------------------------------
do $do$
declare
  r record;
  n integer;
  total integer := 0;
begin
  for r in
    select schema_name, table_name, column_name
    from _clerk_migration.target_columns
    where not (table_name = 'profiles' and column_name = 'id')
      and not (table_name = 'user_stats' and column_name = 'id')
    order by schema_name, table_name, column_name
  loop
    execute format(
      $sql$
      update %I.%I t
      set %I = im.clerk_sub
      from _clerk_migration.identity_map im
      where t.%I = im.old_uuid
      $sql$,
      r.schema_name, r.table_name, r.column_name, r.column_name
    );
    get diagnostics n = row_count;
    total := total + n;
    raise notice 'updated %.%.%: % rows', r.schema_name, r.table_name, r.column_name, n;
  end loop;
  raise notice 'TOTAL ownership rows updated: %', total;
end
$do$;

-- ---------------------------------------------------------------------------
-- 5. Re-create the FK constraints we dropped in step 1
--    Both sides are now text, so they should be type-compatible.
-- ---------------------------------------------------------------------------
do $do$
declare
  r record;
  failed text[] := '{}';
begin
  for r in select * from _clerk_migration.fk_to_disable order by id loop
    begin
      execute format(
        'alter table %I.%I add constraint %I %s',
        r.schema_name, r.table_name, r.constraint_name, r.definition
      );
      raise notice 'restored FK %.% (%)', r.schema_name, r.table_name, r.constraint_name;
    exception
      when others then
        failed := failed || format('%.% (%): %', r.schema_name, r.table_name, r.constraint_name, SQLERRM);
    end;
  end loop;

  if array_length(failed, 1) > 0 then
    raise warning 'Some FKs failed to restore (check manually): %', array_to_string(failed, '; ');
  else
    raise notice 'All % FKs restored successfully', (select count(*) from _clerk_migration.fk_to_disable);
  end if;
end
$do$;

-- ---------------------------------------------------------------------------
-- 6. Verification
-- ---------------------------------------------------------------------------
-- 6a. Any ownership column still holding a UUID (not mapped)?
select tc.table_name, tc.column_name, count(*) as unmapped_rows
from _clerk_migration.target_columns tc
join information_schema.columns c
  on c.table_schema = tc.schema_name
 and c.table_name  = tc.table_name
 and c.column_name = tc.column_name
where c.data_type = 'text'
group by tc.table_name, tc.column_name
having count(*) filter (where c.column_name = 'id' and tc.table_name in ('profiles','user_stats')) > 0
   or count(*) filter (where c.column_name = 'user_id') > 0
order by 1, 2;

-- 6b. Rows that didn't match the identity map (should be zero)
do $do$
declare
  r record;
  total_unmapped integer := 0;
begin
  for r in
    select schema_name, table_name, column_name
    from _clerk_migration.target_columns
    order by schema_name, table_name, column_name
  loop
    execute format(
      $sql$
      select count(*) from %I.%I
      where %I not in (select clerk_sub from _clerk_migration.identity_map)
        and %I is not null
      $sql$,
      r.schema_name, r.table_name, r.column_name, r.column_name
    ) into r;
    if r.count > 0 then
      raise notice 'UNMAPPED: %.%.% has % rows not in identity_map', r.schema_name, r.table_name, r.column_name, r.count;
      total_unmapped := total_unmapped + r.count;
    end if;
  end loop;
  if total_unmapped = 0 then
    raise notice '✅ All ownership rows mapped successfully';
  else
    raise warning '⚠️  % total unmapped rows remain — some users may not see their data', total_unmapped;
  end if;
end
$do$;

-- 6c. Summary
select
  (select count(*) from _clerk_migration.identity_map) as identity_map_rows,
  (select count(*) from _clerk_migration.target_columns) as converted_columns,
  (select count(*) from _clerk_migration.fk_to_disable) as fks_recreated;

commit;

-- ============================================================================
-- POST-BACKFILL CHECKLIST
-- ============================================================================
-- After this commits:
--   1. Verify RLS works: SET LOCAL request.jwt.claims = '{"sub":"user_2abc..."}';
--      SELECT * FROM public.transactions;  -- should show only that user's rows
--   2. Redefine RPCs with p_user_id uuid → p_user_id text (see step 2 in
--      neon-clerk-schema.sql's post-commit notes)
--   3. Point the app at Neon (once Data API is available) or keep on Supabase
--      until the full cutover.
-- ============================================================================