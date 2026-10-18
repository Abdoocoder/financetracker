-- Migration: 20261019000000_zakat_engine_v2.sql
-- Purpose: Path B Phase 1 — Zakat engine unification (DB layer only).
--   1) New table zakat_holdings — first-class gold/silver/real-estate assets
--      so the RPC can include them in the zakatable base (previously clients
--      patched grams × price in TypeScript/Dart after the RPC returned).
--   2) Audit columns on zakat_history — historical rows become recomputable
--      (prices + fx rate + engine version stored per record).
--   3) get_zakat_summary v2 — same signature (backward compatible), extended
--      JSON payload with a full component breakdown, GREATEST(…, 0) clamp on
--      negative nets (parity with the old mobile behavior), engine_version 2.
--   4) New RPC get_zakat_hauls — replaces the three client-side Hawl
--      implementations (web page, mobile screen, cron route).
--
-- SECURITY: both RPCs keep SECURITY DEFINER + the owner-verification guard
-- and follow the 20261018 hardening convention (EXECUTE revoked from
-- PUBLIC/anon, granted to authenticated + service_role). The guard mirrors
-- get_financial_dashboard's pattern:
--   auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id
--   -> authenticated callers can only read their own data (uid present and
--      mismatched raises), while server-side jobs (service_role, no JWT)
--      have a NULL uid and may process any user for crons. anon stays
--      blocked because it has no EXECUTE privilege at all.
--
-- This migration is additive: no existing column is dropped or renamed, so
-- current web/mobile clients keep working unchanged during the rollout window.

begin;

-- ── 1) zakat_holdings ─────────────────────────────────────────────────────

create table if not exists public.zakat_holdings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  asset_type   text not null check (asset_type in ('gold', 'silver', 'real_estate', 'inventory', 'other')),
  grams        numeric(12, 4),          -- gold/silver only
  value_usd    numeric(15, 2),          -- real_estate/inventory/other (USD, converted via fx rate)
  purchase_date date,                   -- Hawl start when known; falls back to created_at
  created_at   timestamptz not null default now(),
  -- gold/silver must carry grams; everything else must carry value_usd
  constraint zakat_holdings_shape check (
    (asset_type in ('gold', 'silver')       and grams is not null)
    or (asset_type not in ('gold', 'silver') and value_usd is not null)
  )
);

create index if not exists idx_zakat_holdings_user
  on public.zakat_holdings(user_id);

alter table public.zakat_holdings enable row level security;

drop policy if exists "users manage own zakat holdings" on public.zakat_holdings;
create policy "users manage own zakat holdings"
  on public.zakat_holdings for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ── 2) zakat_history audit columns ────────────────────────────────────────

alter table public.zakat_history
  add column if not exists nisab_effective numeric,
  add column if not exists price_gold      numeric,
  add column if not exists price_silver    numeric,
  add column if not exists fx_rate         numeric,
  add column if not exists engine_version  integer default 2;

-- ── 3) get_zakat_summary v2 ───────────────────────────────────────────────
-- Same parameter list as v1 — no client change needed to keep calling it.
-- Additions: zakat_holdings in the zakatable base, GREATEST(…, 0) clamp,
-- components breakdown, engine_version. Top-level v1 keys are preserved.

create or replace function public.get_zakat_summary(
  p_user_id uuid,
  p_gold_price_per_gram double precision,
  p_silver_price_per_gram double precision,
  p_usd_to_local_rate double precision default 1.0
)
returns json
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'auth', 'pg_temp'
as $function$
declare
  v_dash json;
  v_nisab_gold numeric;
  v_nisab_silver numeric;
  v_nisab_effective numeric;
  v_zakatable_raw numeric;
  v_zakatable_assets numeric;
  v_zakat_due numeric;
  v_is_eligible boolean;
  -- مكونات الوعاء الزكوي (للعرض الشفاف في الواجهات)
  v_cash numeric;
  v_investments numeric;
  v_investment_cash numeric;
  v_goals numeric;
  v_debts numeric;
  v_gold numeric;
  v_silver numeric;
  v_other numeric;
begin
  -- NULL uid = server-side caller (service_role / cron): allowed.
  -- Non-NULL uid must match the requested user (owner verification).
  if auth.uid() is not null and auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized';
  end if;

  v_dash := public.get_financial_dashboard(p_user_id, p_usd_to_local_rate);

  v_cash            := coalesce((v_dash->>'total_accounts_balance')::numeric, 0);
  v_investments     := coalesce((v_dash->>'investments_value_local')::numeric, 0);
  v_investment_cash := coalesce((v_dash->>'investment_cash_local')::numeric, 0);
  v_goals           := coalesce((v_dash->>'goals_saved')::numeric, 0);
  v_debts           := coalesce((v_dash->>'total_debt_owed')::numeric, 0);

  -- الأصول الزكوية المسجلة يدوياً (ذهب/فضة بالغرام، عقار/بضاعة/أخرى بالقيمة بالدولار)
  select
    coalesce(sum(case when h.asset_type = 'gold'
                      then (h.grams * p_gold_price_per_gram)::numeric else 0 end), 0),
    coalesce(sum(case when h.asset_type = 'silver'
                      then (h.grams * p_silver_price_per_gram)::numeric else 0 end), 0),
    coalesce(sum(case when h.asset_type in ('real_estate', 'inventory', 'other')
                      then coalesce(h.value_usd, 0) else 0 end), 0) * p_usd_to_local_rate
  into v_gold, v_silver, v_other
  from public.zakat_holdings h
  where h.user_id = p_user_id;

  -- النصاب (الذهب 85غ، الفضة 595غ) — الأقل منهما لصالح الفقير
  v_nisab_gold    := 85 * p_gold_price_per_gram;
  v_nisab_silver  := 595 * p_silver_price_per_gram;
  v_nisab_effective := least(v_nisab_gold, v_nisab_silver);

  -- الوعاء = (نقد + استثمارات + كاش استثمار + مدخرات + ذهب + فضة + أخرى) - ديون
  v_zakatable_raw := v_cash + v_investments + v_investment_cash + v_goals
                   + v_gold + v_silver + v_other - v_debts;

  -- لا سالب: صافي الوعاء صفر كحد أدنى (سلوك تطبيق الموبايل القديم)
  v_zakatable_assets := greatest(v_zakatable_raw, 0);

  if v_zakatable_assets >= v_nisab_effective then
    v_is_eligible := true;
    v_zakat_due := v_zakatable_assets * 0.025; -- 2.5% للسنة القمرية
  else
    v_is_eligible := false;
    v_zakat_due := 0;
  end if;

  return json_build_object(
    -- مفاتيح v1 (للتوافق مع العملاء الحاليين)
    'is_eligible', v_is_eligible,
    'zakat_due', v_zakat_due,
    'zakatable_assets', v_zakatable_assets,
    'nisab_gold', v_nisab_gold,
    'nisab_silver', v_nisab_silver,
    'nisab_effective', v_nisab_effective,
    -- مفاتيح v2 (تفصيل المكونات + رقم المحرك)
    'components', json_build_object(
      'cash', v_cash,
      'investments', v_investments,
      'investment_cash', v_investment_cash,
      'goals', v_goals,
      'gold', v_gold,
      'silver', v_silver,
      'other', v_other,
      'debts', v_debts
    ),
    'engine_version', 2
  );
end;
$function$;

-- ── 4) get_zakat_hauls — مصدر الحول الوحيد ────────────────────────────────
-- يعيد مصفوفة JSON بكل الحولات النشطة (استثمارات + ذهب + فضة) محسوبة من
-- COALESCE(purchase_date, created_at) + 354 يوماً هجرياً، مع الأيام المتبقية.
-- يستبدل حساب الحول المكرر في صفحة الويب وشاشة الموبايل ومسار الـ cron.

create or replace function public.get_zakat_hauls(p_user_id uuid)
returns json
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'auth', 'pg_temp'
as $function$
declare
  v_result json;
begin
  -- NULL uid = server-side caller (service_role / cron): allowed.
  -- Non-NULL uid must match the requested user (owner verification).
  if auth.uid() is not null and auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized';
  end if;

  select coalesce(json_agg(item order by item.haul_date), '[]'::json)
  into v_result
  from (
    select
      'investment'::text as source,
      i.id::text as ref_id,
      coalesce(i.symbol, i.name) as label,
      null::text as asset_type,
      null::numeric as grams,
      (i.shares * i.current_price) as value_usd,
      (coalesce(i.purchase_date, i.created_at::date) + 354) as haul_date,
      (coalesce(i.purchase_date, i.created_at::date) + 354 - current_date) as days_remaining
    from public.investments i
    where i.user_id = p_user_id
    union all
    select
      'holding'::text,
      h.id::text,
      h.asset_type,
      h.asset_type,
      h.grams,
      h.value_usd,
      (coalesce(h.purchase_date, h.created_at::date) + 354),
      (coalesce(h.purchase_date, h.created_at::date) + 354 - current_date)
    from public.zakat_holdings h
    where h.user_id = p_user_id
      and h.asset_type in ('gold', 'silver')
  ) item;
  return v_result;
end;
$function$;

-- ── 5) Grants (20261018 hardening convention) ─────────────────────────────

revoke execute on function public.get_zakat_summary(uuid, double precision, double precision, double precision)
  from public, anon;
grant execute on function public.get_zakat_summary(uuid, double precision, double precision, double precision)
  to authenticated, service_role;

revoke execute on function public.get_zakat_hauls(uuid)
  from public, anon;
grant execute on function public.get_zakat_hauls(uuid)
  to authenticated, service_role;

commit;
