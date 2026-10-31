-- ============================================================================
-- neon-clerk-triggers.sql
--
-- Fixes trigger functions for Clerk migration (uuid → text user_id).
--
-- RUN ORDER (after neon-clerk-rpc-migration.sql):
--   1. neon-clerk-schema.sql
--   2. neon-clerk-backfill.sql
--   3. neon-clerk-rpc-migration.sql
--   4. THIS SCRIPT
--
-- PREREQUISITES:
--   - All ownership columns already converted to text
--   - RPCs already migrated to text parameters
--   - auth.uid() returns text (Clerk sub via auth.jwt() shim)
-- ============================================================================

begin;

set local lock_timeout = '30s';
set local search_path = public, pg_temp;

-- ============================================================================
-- 1. handle_new_user() — DEAD WITH CLERK
-- ============================================================================
-- Clerk doesn't use GoTrue auth.users. The on_auth_user_created trigger
-- will never fire because there's no auth.users table on Neon (or it's not
-- being written to by Clerk). Drop the trigger and function entirely.
-- The app creates profiles via API on first sign-in instead.
-- ============================================================================
do $do$
begin
  if to_regclass('auth.users') is not null then
    execute 'drop trigger if exists on_auth_user_created on auth.users';
    raise notice 'dropped on_auth_user_created trigger on auth.users';
  else
    raise notice 'auth.users does not exist — no signup trigger to drop';
  end if;
end
$do$;

drop function if exists public.handle_new_user();

-- ============================================================================
-- 2. notify_user(p_user_id text, ...) — Called by check_budget_limits
-- ============================================================================
-- Change p_user_id from uuid to text. All internal queries use text comparison.
-- ============================================================================
create or replace function public.notify_user(
  p_user_id       text,
  p_category      notification_category,
  p_title         text,
  p_body          text,
  p_data          jsonb default '{}',
  p_fingerprint   text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pref record;
begin
  select enabled, priority, mask_sensitive_data, quiet_start, quiet_end
  into v_pref
  from public.notification_preferences
  where user_id = p_user_id and category = p_category;

  if v_pref.enabled = false then
    return;
  end if;

  if p_fingerprint is not null then
    if exists (
      select 1 from public.notification_history
      where user_id = p_user_id
        and fingerprint = p_fingerprint
        and sent_at > now() - interval '24 hours'
    ) then
      return;
    end if;
  end if;

  if v_pref.mask_sensitive_data then
    p_body := regexp_replace(p_body, '\d+(\.\d+)?', '***', 'g');
  end if;

  insert into public.notification_history (user_id, category, title, body, data, fingerprint)
  values (p_user_id, p_category, p_title, p_body, p_data, p_fingerprint);
end;
$$;

revoke execute on function public.notify_user(text, notification_category, text, text, jsonb, text) from public, anon;
grant execute on function public.notify_user(text, notification_category, text, text, jsonb, text) to authenticated, service_role;

-- ============================================================================
-- 3. check_budget_limits() — Trigger on transactions
-- ============================================================================
-- Uses NEW.user_id (now text). All queries already compare to NEW.user_id,
-- so they work automatically after column type change. Just need to ensure
-- notify_user is called with text (fixed above).
-- ============================================================================
create or replace function public.check_budget_limits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_budget record;
  v_total_spent numeric;
  v_threshold_80 numeric;
  v_month int;
  v_year int;
  v_fingerprint text;
begin
  if new.type != 'expense' then return new; end if;

  v_month := extract(month from new.transaction_date);
  v_year := extract(year from new.transaction_date);

  select * into v_budget
  from public.budgets
  where user_id = new.user_id
    and category = new.category
    and month = v_month
    and year = v_year;

  if not found then return new; end if;

  select coalesce(sum(amount), 0) into v_total_spent
  from public.transactions
  where user_id = new.user_id
    and category = new.category
    and transaction_date >= make_date(v_year, v_month, 1)
    and transaction_date < (make_date(v_year, v_month, 1) + interval '1 month');

  v_threshold_80 := v_budget.monthly_limit * 0.8;

  if v_total_spent >= v_budget.monthly_limit then
    v_fingerprint := 'budget_100_' || v_budget.id || '_' || v_month || '_' || v_year;
    perform public.notify_user(
      new.user_id,
      'BudgetAlert',
      'تنبيه: تجاوز الميزانية! ⚠️',
      format('لقد تجاوزت ميزانية %s المحددة بـ %s. إجمالي المصروف: %s', new.category, v_budget.monthly_limit, v_total_spent),
      jsonb_build_object('budget_id', v_budget.id, 'url', '/main?tab=1'),
      v_fingerprint
    );
  elsif v_total_spent >= v_threshold_80 then
    v_fingerprint := 'budget_80_' || v_budget.id || '_' || v_month || '_' || v_year;
    perform public.notify_user(
      new.user_id,
      'BudgetAlert',
      'اكتمل 80% من الميزانية 📈',
      format('لقد استهلكت %s من ميزانية %s المخصصة لهذا الشهر.', v_total_spent, new.category),
      jsonb_build_object('budget_id', v_budget.id, 'url', '/main?tab=1'),
      v_fingerprint
    );
  end if;

  return new;
end;
$$;

revoke execute on function public.check_budget_limits() from public, anon;
grant execute on function public.check_budget_limits() to authenticated, service_role;

-- ============================================================================
-- 4. assign_default_account() — Trigger on transactions
-- ============================================================================
-- Uses NEW.user_id (now text) to query accounts table. Works automatically
-- after column type change. No code change needed beyond ensuring search_path.
-- ============================================================================
create or replace function public.assign_default_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.account_id is null and new.type != 'transfer' then
    select id into new.account_id
    from public.accounts
    where user_id = new.user_id and is_default = true
    limit 1;
  end if;
  return new;
end;
$$;

revoke execute on function public.assign_default_account() from public, anon;
grant execute on function public.assign_default_account() to authenticated, service_role;

-- ============================================================================
-- 5. sync_debt_remaining_foreign() — Trigger on debts
-- ============================================================================
-- Only touches remaining_amount and exchange_rate. No user_id usage. SAFE.
-- Just ensure search_path is set (already done in 036, but re-assert).
-- ============================================================================
alter function public.sync_debt_remaining_foreign() set search_path = public;

-- ============================================================================
-- 6. handle_updated_at() — Generic updated_at trigger
-- ============================================================================
-- Used by profiles, debts, investments, savings_goals. Only sets updated_at.
-- SAFE — no user_id usage.
-- ============================================================================
alter function public.handle_updated_at() set search_path = public;

-- ============================================================================
-- 7. update_updated_at_column() — Used by chats
-- ============================================================================
-- Only sets updated_at. SAFE.
-- ============================================================================
alter function public.update_updated_at_column() set search_path = public;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- List all non-internal triggers and their functions
select t.tgname as trigger_name,
       c.relname as table_name,
       p.proname as function_name,
       pg_get_functiondef(p.oid) as function_def
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_proc p on p.oid = t.tgfoid
where not t.tgisinternal
  and c.relnamespace = 'public'::regnamespace
order by c.relname, t.tgname;

raise notice 'Trigger audit complete. handle_new_user dropped. notify_user, check_budget_limits, assign_default_account updated to text.';

commit;

-- ============================================================================
-- POST-MIGRATION NOTES
-- ============================================================================
-- 1. handle_new_user() and on_auth_user_created trigger are GONE.
--    Profile creation now happens via API on first Clerk sign-in.
--    The web/mobile app must call a "ensure profile" endpoint or the
--    profile creation RPC after sign-up.
--
-- 2. All remaining trigger functions work with text user_id because:
--    - They reference NEW.user_id which is now text
--    - They query tables where user_id is now text
--    - notify_user() now accepts text
--
-- 3. sync_debt_remaining_foreign(), handle_updated_at(),
--    update_updated_at_column() were SAFE — no changes needed.
--
-- 4. The triggers themselves (trg_check_budget_limits, set_default_account,
--    debt_sync_remaining_foreign, handle_profiles_updated_at, etc.) don't
--    need recreation — they call the updated functions automatically.
-- ============================================================================