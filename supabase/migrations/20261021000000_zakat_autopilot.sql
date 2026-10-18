-- Migration: 20261021000000_zakat_autopilot.sql
-- Purpose: Path C — Zakat Autopilot state machine (Hawl tracking +
--   proactive-notification bookkeeping), additive on top of the zakat
--   engine v2 (20261019000000). No existing RPC, table, or client code is
--   modified: get_zakat_summary and get_zakat_hauls are called as-is.
--
--   1) New table zakat_haul_tracking — one row per user holding the Hawl
--      clock:
--        nisab_reached_at    the exact timestamp the user's zakatable
--                            assets first crossed the effective Nisab
--        current_haul_due_at nisab_reached_at + 354 days (Hijri year)
--        last_notified_at    anti-spam stamp written by the daily cron
--                            route (/api/zakat-autopilot) after a push
--
--   2) New RPC sync_zakat_haul_state — SECURITY DEFINER state machine that
--      reuses the existing engine (get_zakat_summary, unmodified) and
--      upserts the tracking row:
--        above Nisab, no prior state  -> start the clock (now, now+354d)
--        above Nisab, active state    -> keep the clock (Hawl continuity —
--                                        a running haul never restarts)
--        below Nisab                  -> clear both timestamps (the wealth
--                                        dropped below Nisab: the Hawl breaks)
--      last_notified_at is intentionally NOT touched by the RPC: only the
--      cron route writes it, and the reset path must not erase the
--      once-per-day notification stamp.
--
-- SECURITY: same conventions as 20261019000000 —
--   * SECURITY DEFINER + the owner-verification guard:
--       auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id
--     -> authenticated callers can only sync their own state (uid present
--        and mismatched raises), while server-side jobs (service_role, no
--        JWT) have a NULL uid and may process any user for crons. anon
--        stays blocked because it has no EXECUTE privilege at all.
--   * Table: RLS enabled; clients get SELECT-only on their own row. There
--     is deliberately NO INSERT/UPDATE policy — writes happen exclusively
--     inside the SECURITY DEFINER RPC (table owner) and via service_role
--     crons, so a compromised client token cannot forge or reset its clock.
--
-- Note on indexing: user_id is the primary key, so the FK lookup path is
-- already led by the pkey index — a separate FK index would be a duplicate.

begin;

-- ── 1) zakat_haul_tracking ───────────────────────────────────────────────

create table if not exists public.zakat_haul_tracking (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  nisab_reached_at    timestamptz,
  current_haul_due_at timestamptz,
  last_notified_at    timestamptz
);

alter table public.zakat_haul_tracking enable row level security;

-- Clients may read their own state (e.g. to render a countdown) …
drop policy if exists "users select own haul tracking" on public.zakat_haul_tracking;
create policy "users select own haul tracking"
  on public.zakat_haul_tracking for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- … and nothing else: revoke the default API grants, re-grant SELECT only.
revoke all on table public.zakat_haul_tracking from public, anon, authenticated;
grant select on table public.zakat_haul_tracking to authenticated;
grant all  on table public.zakat_haul_tracking to service_role;

-- ── 2) sync_zakat_haul_state — آلة حالة الحول ────────────────────────────
-- Parameters mirror the engine's price inputs; defaults match the standard
-- assumptions used across the zakat fixtures (gold 30, silver 0.35, fx 1.0).

create or replace function public.sync_zakat_haul_state(
  p_user_id uuid,
  p_gold_price numeric default 30,
  p_silver_price numeric default 0.35,
  p_fx_rate numeric default 1.0
)
returns json
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'auth', 'pg_temp'
as $function$
declare
  v_summary     json;
  v_assets      numeric;
  v_nisab       numeric;
  v_due_amount  numeric;
  v_reached_at  timestamptz;
  v_haul_due_at timestamptz;
  v_result      json;
begin
  -- NULL uid = server-side caller (service_role / cron): allowed.
  -- Non-NULL uid must match the requested user (owner verification).
  if auth.uid() is not null and auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized';
  end if;

  -- Motor the existing engine (unmodified) — single source of truth for
  -- the zakatable base and the effective Nisab.
  v_summary := public.get_zakat_summary(
    p_user_id,
    p_gold_price::double precision,
    p_silver_price::double precision,
    p_fx_rate::double precision
  );

  v_assets     := coalesce((v_summary->>'zakatable_assets')::numeric, 0);
  v_nisab      := coalesce((v_summary->>'nisab_effective')::numeric, 0);
  v_due_amount := coalesce((v_summary->>'zakat_due')::numeric, 0);

  if v_assets >= v_nisab then
    -- Above Nisab: adopt the running clock if one exists, else start it.
    select t.nisab_reached_at into v_reached_at
    from public.zakat_haul_tracking t
    where t.user_id = p_user_id;

    if v_reached_at is null then
      v_reached_at := now(); -- first crossing detected: the Hawl begins
    end if;
    -- Hawl continuity: recomputing the due date from the adopted start
    -- timestamp means a running haul is never restarted by a re-sync.
    v_haul_due_at := v_reached_at + interval '354 days';
  else
    -- Below Nisab: the Hawl breaks — clear the clock. (An active row whose
    -- wealth dipped under the Nisab mid-hawl restarts from the next
    -- crossing, per the fiatqh rule this state machine encodes.)
    v_reached_at  := null;
    v_haul_due_at := null;
  end if;

  -- Upsert (last_notified_at deliberately left untouched).
  insert into public.zakat_haul_tracking (user_id, nisab_reached_at, current_haul_due_at)
  values (p_user_id, v_reached_at, v_haul_due_at)
  on conflict (user_id) do update
    set nisab_reached_at    = excluded.nisab_reached_at,
        current_haul_due_at = excluded.current_haul_due_at;

  -- Return the refreshed row plus the engine figures the cron route needs
  -- to compose the notification body (due amount / eligibility).
  select json_build_object(
    'user_id',             t.user_id,
    'nisab_reached_at',    t.nisab_reached_at,
    'current_haul_due_at', t.current_haul_due_at,
    'last_notified_at',    t.last_notified_at,
    'days_remaining',      case when t.current_haul_due_at is null then null
                                else extract(day from t.current_haul_due_at - now())::int end,
    'is_eligible',         v_assets >= v_nisab,
    'zakatable_assets',    v_assets,
    'nisab_effective',     v_nisab,
    'zakat_due',           v_due_amount
  ) into v_result
  from public.zakat_haul_tracking t
  where t.user_id = p_user_id;

  return v_result;
end;
$function$;

-- ── 3) Grants (20261018 hardening convention) ─────────────────────────────

revoke execute on function public.sync_zakat_haul_state(uuid, numeric, numeric, numeric)
  from public, anon;
grant execute on function public.sync_zakat_haul_state(uuid, numeric, numeric, numeric)
  to authenticated, service_role;

commit;
