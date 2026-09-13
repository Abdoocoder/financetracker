-- =============================================
-- 20260913135653_add_prod_only_schema.sql
-- Schema-parity migration: codifies objects that live in PRODUCTION
-- (created via the Supabase SQL editor) but have no migration file.
--
-- Without this, `supabase db reset` / branch previews would produce a
-- schema that diverges from production: profiles extra columns +
-- user_stats, testimonials, saving_challenges, health_score_history.
--
-- Safety: every statement is idempotent (IF NOT EXISTS / drop-then-create)
-- so applying this migration to the LIVE project is a no-op that leaves
-- the existing prod schema untouched.
-- =============================================

-- ------------------------------------------------------------------
-- PROFILES — extra columns present in prod but missing from migrations
-- ------------------------------------------------------------------
alter table public.profiles add column if not exists salary_day integer default 1;
alter table public.profiles add column if not exists asset_real_estate numeric default 0;
alter table public.profiles add column if not exists asset_vehicles numeric default 0;
alter table public.profiles add column if not exists asset_jewelry numeric default 0;
alter table public.profiles add column if not exists asset_other numeric default 0;
alter table public.profiles add column if not exists assets_updated_at timestamptz;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists job_title text;
alter table public.profiles add column if not exists birth_date date;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists onboarding_done boolean default false;
alter table public.profiles add column if not exists lang text default 'ar';
alter table public.profiles add column if not exists lesson_streak integer default 0;
alter table public.profiles add column if not exists last_lesson_date date;
alter table public.profiles add column if not exists opening_balance numeric not null default 0;

-- Check constraints (drop-then-create for idempotency on live)
alter table public.profiles drop constraint if exists profiles_lang_check;
alter table public.profiles add constraint profiles_lang_check check (lang in ('ar', 'en'));

alter table public.profiles drop constraint if exists profiles_salary_day_check;
alter table public.profiles add constraint profiles_salary_day_check check (salary_day between 1 and 28);

-- ------------------------------------------------------------------
-- USER_STATS — gamification counters (streaks, points, badges)
-- ------------------------------------------------------------------
create table if not exists public.user_stats (
  id uuid primary key references auth.users(id) on delete cascade,
  streak_days integer default 0,
  last_activity_date date,
  total_points integer default 0,
  level integer default 1,
  badges jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

alter table public.user_stats enable row level security;

drop policy if exists "Users own stats" on public.user_stats;
create policy "Users own stats" on public.user_stats
  for all using (auth.uid() = id);

grant select, insert, update, delete on public.user_stats to authenticated;

-- ------------------------------------------------------------------
-- TESTIMONIALS — public landing page + user-submitted testimonials
-- ------------------------------------------------------------------
create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  country text,
  role text,
  stars integer check (stars between 1 and 5),
  text text not null,
  is_visible boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_testimonials_user_id on public.testimonials(user_id);

alter table public.testimonials enable row level security;

drop policy if exists "Public can view visible testimonials" on public.testimonials;
create policy "Public can view visible testimonials" on public.testimonials
  for select using (is_visible = true);

drop policy if exists "Users own testimonials insert" on public.testimonials;
create policy "Users own testimonials insert" on public.testimonials
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users own testimonials update" on public.testimonials;
create policy "Users own testimonials update" on public.testimonials
  for update using (auth.uid() = user_id);

drop policy if exists "Users own testimonials delete" on public.testimonials;
create policy "Users own testimonials delete" on public.testimonials
  for delete using (auth.uid() = user_id);

grant select on public.testimonials to anon, authenticated;
grant insert, update, delete on public.testimonials to authenticated;

-- ------------------------------------------------------------------
-- SAVING_CHALLENGES — savings challenges tracking
-- ------------------------------------------------------------------
create table if not exists public.saving_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  description text,
  target_amount numeric default 0,
  current_amount numeric default 0,
  start_date date default current_date,
  end_date date,
  is_completed boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_saving_challenges_user_id on public.saving_challenges(user_id);

alter table public.saving_challenges enable row level security;

drop policy if exists "Users can manage own challenges" on public.saving_challenges;
create policy "Users can manage own challenges" on public.saving_challenges
  for all using (auth.uid() = user_id);

grant select, insert, update, delete on public.saving_challenges to authenticated;

-- ------------------------------------------------------------------
-- HEALTH_SCORE_HISTORY — daily financial health snapshots
-- ------------------------------------------------------------------
create table if not exists public.health_score_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  score integer not null,
  income numeric default 0,
  expenses numeric default 0,
  total_debt numeric default 0,
  inv_value numeric default 0,
  goals_saved numeric default 0,
  recorded_at date not null default current_date,
  unique (user_id, recorded_at)
);

alter table public.health_score_history enable row level security;

drop policy if exists "users manage own scores" on public.health_score_history;
create policy "users manage own scores" on public.health_score_history
  for all using (auth.uid() = user_id);

grant select, insert, update, delete on public.health_score_history to authenticated;