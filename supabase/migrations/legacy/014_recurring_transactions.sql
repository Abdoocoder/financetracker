-- ── جدول المعاملات المتكررة (multi-frequency scheduler) ──
create table public.recurring_transactions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  amount numeric(10,2) not null,
  category text not null,
  type text not null check (type in ('income', 'expense')),
  frequency text not null check (frequency in ('daily', 'weekly', 'monthly', 'yearly')),
  next_date date not null,
  currency text default 'JOD',
  notes text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.recurring_transactions enable row level security;

create policy "Users own recurring_transactions"
  on public.recurring_transactions for all
  using (auth.uid() = user_id);

create index idx_recurring_user_active
  on public.recurring_transactions(user_id, is_active);

create index idx_recurring_next_date
  on public.recurring_transactions(next_date)
  where is_active = true;

-- source_recurring_id على transactions لمنع التكرار
alter table public.transactions
  add column if not exists source_recurring_id uuid references public.recurring_transactions(id) on delete set null;
