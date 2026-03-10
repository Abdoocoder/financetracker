-- =============================================
-- FinanceTracker SaaS - Database Schema
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================
-- PROFILES (extends auth.users)
-- =============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  currency text default 'JOD',
  monthly_income numeric(10,2) default 0,
  timezone text default 'Asia/Amman',
  plan text default 'free' check (plan in ('free', 'pro')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- =============================================
-- TRANSACTIONS (income & expenses)
-- =============================================
create table public.transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('income', 'expense')),
  category text not null,
  amount numeric(10,2) not null,
  description text,
  transaction_date date not null default current_date,
  is_recurring boolean default false,
  recurring_day int check (recurring_day between 1 and 31),
  created_at timestamptz default now()
);

alter table public.transactions enable row level security;
create policy "Users own transactions" on public.transactions for all using (auth.uid() = user_id);
create index idx_transactions_user_date on public.transactions(user_id, transaction_date desc);

-- =============================================
-- DEBTS
-- =============================================
create table public.debts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  original_amount numeric(10,2) not null,
  remaining_amount numeric(10,2) not null,
  monthly_payment numeric(10,2) default 0,
  due_date date,
  priority int default 3 check (priority between 1 and 5),
  notes text,
  is_paid boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.debts enable row level security;
create policy "Users own debts" on public.debts for all using (auth.uid() = user_id);

-- Debt payments log
create table public.debt_payments (
  id uuid default uuid_generate_v4() primary key,
  debt_id uuid references public.debts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric(10,2) not null,
  payment_date date not null default current_date,
  notes text,
  created_at timestamptz default now()
);

alter table public.debt_payments enable row level security;
create policy "Users own debt_payments" on public.debt_payments for all using (auth.uid() = user_id);

-- =============================================
-- INVESTMENTS
-- =============================================
create table public.investments (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  symbol text not null,
  name text not null,
  type text not null check (type in ('stock', 'etf', 'crypto', 'other')),
  shares numeric(20,8) default 0,
  avg_buy_price numeric(10,4) default 0,
  current_price numeric(10,4) default 0,
  currency text default 'USD',
  is_halal boolean default true,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.investments enable row level security;
create policy "Users own investments" on public.investments for all using (auth.uid() = user_id);

-- Investment transactions
create table public.investment_transactions (
  id uuid default uuid_generate_v4() primary key,
  investment_id uuid references public.investments(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('buy', 'sell')),
  shares numeric(20,8) not null,
  price numeric(10,4) not null,
  commission numeric(10,4) default 0,
  transaction_date date not null default current_date,
  notes text,
  created_at timestamptz default now()
);

alter table public.investment_transactions enable row level security;
create policy "Users own investment_transactions" on public.investment_transactions for all using (auth.uid() = user_id);

-- =============================================
-- BUDGETS (monthly targets)
-- =============================================
create table public.budgets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  category text not null,
  monthly_limit numeric(10,2) not null,
  month int not null check (month between 1 and 12),
  year int not null,
  created_at timestamptz default now(),
  unique(user_id, category, month, year)
);

alter table public.budgets enable row level security;
create policy "Users own budgets" on public.budgets for all using (auth.uid() = user_id);

-- =============================================
-- ALERTS & NOTIFICATIONS
-- =============================================
create table public.alerts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('warning', 'motivation', 'reminder', 'achievement')),
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly', 'once')),
  title text not null,
  message text not null,
  is_read boolean default false,
  is_active boolean default true,
  trigger_condition jsonb,
  scheduled_for timestamptz,
  created_at timestamptz default now()
);

alter table public.alerts enable row level security;
create policy "Users own alerts" on public.alerts for all using (auth.uid() = user_id);

-- =============================================
-- SAVINGS GOALS
-- =============================================
create table public.savings_goals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  target_amount numeric(10,2) not null,
  current_amount numeric(10,2) default 0,
  target_date date,
  icon text default '🎯',
  color text default '#2E75B6',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.savings_goals enable row level security;
create policy "Users own savings_goals" on public.savings_goals for all using (auth.uid() = user_id);

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $body$
begin
  insert into public.profiles (id, full_name, monthly_income)
  values (
    new.id, 
    new.raw_user_meta_data->>'full_name',
    (new.raw_user_meta_data->>'monthly_income')::numeric
  );
  return new;
end;
$body$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger handle_profiles_updated_at before update on public.profiles
  for each row execute procedure public.handle_updated_at();
create trigger handle_debts_updated_at before update on public.debts
  for each row execute procedure public.handle_updated_at();
create trigger handle_investments_updated_at before update on public.investments
  for each row execute procedure public.handle_updated_at();
create trigger handle_goals_updated_at before update on public.savings_goals
  for each row execute procedure public.handle_updated_at();

-- =============================================
-- VIEWS
-- =============================================

-- Monthly summary view
create or replace view public.monthly_summary as
select
  user_id,
  extract(year from transaction_date) as year,
  extract(month from transaction_date) as month,
  sum(case when type = 'income' then amount else 0 end) as total_income,
  sum(case when type = 'expense' then amount else 0 end) as total_expenses,
  sum(case when type = 'income' then amount else -amount end) as net_balance
from public.transactions
group by user_id, year, month;

-- Debt summary view
create or replace view public.debt_summary as
select
  user_id,
  count(*) as total_debts,
  sum(original_amount) as total_original,
  sum(remaining_amount) as total_remaining,
  sum(original_amount - remaining_amount) as total_paid,
  round(sum(original_amount - remaining_amount) / nullif(sum(original_amount), 0) * 100, 1) as paid_percentage
from public.debts
where is_paid = false
group by user_id;
