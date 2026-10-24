begin;

do $$
declare t record;
begin
  for t in select table_name from information_schema.tables where table_schema = 'public' loop
    execute format('revoke all on public.%I from anon', t.table_name);
  end loop;
end $$;

alter default privileges in schema public revoke all on tables from anon;

grant select on public.testimonials to anon;

do $$
declare s record;
begin
  for s in select sequence_name from information_schema.sequences
           where sequence_schema = 'public' loop
    execute format('revoke all on sequence public.%I from anon', s.sequence_name);
  end loop;
end $$;

do $$
declare v_count int;
begin
  select count(*) into v_count from information_schema.role_table_grants
  where table_schema='public' and grantee='anon'
    and privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES');
  if v_count > 0 then raise exception 'anon still has % write grants', v_count; end if;

  select count(*) into v_count from information_schema.role_table_grants
  where table_schema='public' and table_name='testimonials'
    and grantee='anon' and privilege_type='SELECT';
  if v_count <> 1 then raise exception 'anon lost SELECT on testimonials'; end if;
end $$;

commit;