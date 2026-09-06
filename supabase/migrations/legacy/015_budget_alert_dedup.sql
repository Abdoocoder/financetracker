-- ── جدول تتبع تنبيهات الميزانية (منع التكرار) ──
create table public.budget_alert_log (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  budget_id uuid references public.budgets(id) on delete cascade not null,
  alert_month int not null,
  alert_year int not null,
  threshold_pct int not null default 80,
  created_at timestamptz default now(),
  unique(budget_id, alert_month, alert_year, threshold_pct)
);

alter table public.budget_alert_log enable row level security;

create policy "Users own budget_alert_log"
  on public.budget_alert_log for all
  using (auth.uid() = user_id);
