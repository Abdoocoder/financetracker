-- Migration: 20261031000001_notification_history_unique_fingerprint.sql
-- Purpose: Bug 3 — duplicate notification_history rows share a fingerprint.
--
-- Why: lib/push-send.ts only does an advisory SELECT before inserting and then
-- treats SQLSTATE 23505 as "already sent, ignore". That contract depends on a
-- UNIQUE index existing. With nothing enforcing (user_id, fingerprint), two
-- concurrent sends both pass the pre-check and both insert, so the same
-- notification is delivered twice.
--
-- Naming note: `idx_notification_history_fingerprint` is already used by a
-- NON-unique index in 20261030000000_perf_indexes_for_crons.sql (the fingerprint
-- -only advisory pre-check index). Reusing that name here would make
-- `CREATE UNIQUE INDEX IF NOT EXISTS` a silent no-op against the clone, leaving
-- the bug unfixed. The new index therefore has its own name.
--
-- The table holds <6k rows and the CLI runs each migration in one transaction,
-- so no CONCURRENTLY (it cannot run inside a transaction anyway); the dedupe
-- DELETE and the index creation are atomic together.

begin;

-- 1. Remove existing duplicates, keeping the most recent row per fingerprint.
--    sent_at is nullable (DEFAULT now() only), and `DESC` sorts NULLs first in
--    Postgres — which would keep a NULL row and delete the real latest one. So
--    order NULLS LAST, with `id DESC` as a deterministic tie-breaker.
with ranked as (
  select
    id,
    row_number() over (
      partition by user_id, fingerprint
      order by sent_at desc nulls last, id desc
    ) as rn
  from public.notification_history
  where fingerprint is not null
)
delete from public.notification_history nh
using ranked r
where nh.id = r.id
  and r.rn > 1;

-- 2. Enforce uniqueness going forward. Partial, so rows without a fingerprint
--    stay unconstrained (they are not dedupe candidates by design).
create unique index if not exists idx_notification_history_user_fingerprint_unique
  on public.notification_history (user_id, fingerprint)
  where fingerprint is not null;

commit;
