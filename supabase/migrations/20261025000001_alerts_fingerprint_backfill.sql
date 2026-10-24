-- DESTRUCTIVE. Read PR description before merging.

begin;

do $$
declare v_total bigint; v_null bigint; v_distinct bigint;
begin
  select count(*), count(*) filter (where fingerprint is null),
         count(distinct (user_id, type, date_trunc('day', created_at)))
           filter (where fingerprint is null)
    into v_total, v_null, v_distinct from public.alerts;
  if v_total <> 10235 or v_null <> 10235 or v_distinct <> 3799 then
    raise exception 'Aborting: pre-state drifted. expected 10235/10235/3799, got %/%/%',
      v_total, v_null, v_distinct;
  end if;
end $$;

delete from public.alerts a
using public.alerts b
where a.fingerprint is null and b.fingerprint is null
  and a.user_id = b.user_id
  and a.type    = b.type
  and date_trunc('day', a.created_at) = date_trunc('day', b.created_at)
  and a.created_at > b.created_at;

update public.alerts
set fingerprint = md5(user_id::text || '|' || type || '|' ||
  to_char(date_trunc('day', created_at), 'YYYY-MM-DD'))
where fingerprint is null;

do $$
declare v_rows bigint; v_null bigint; v_dupes bigint;
begin
  select count(*), count(*) filter (where fingerprint is null)
    into v_rows, v_null from public.alerts;
  select count(*) into v_dupes from (
    select 1 from public.alerts
    where fingerprint is not null
    group by user_id, fingerprint having count(*) > 1
  ) d;
  if v_null > 0 then raise exception 'Backfill incomplete: % rows NULL', v_null; end if;
  if v_dupes > 0 then raise exception 'Fingerprint collision: % groups', v_dupes; end if;
  if v_rows <> 3799 then raise exception 'Post-dedupe rows % ≠ 3799', v_rows; end if;
end $$;

commit;