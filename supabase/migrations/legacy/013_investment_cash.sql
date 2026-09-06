-- =============================================
-- INVESTMENT CASH BALANCE
-- =============================================
create table public.investment_cash (
  user_id uuid references public.profiles(id) on delete cascade not null,
  currency text not null default 'USD',
  balance numeric(10,2) not null default 0,
  updated_at timestamptz default now(),
  primary key (user_id, currency)
);

alter table public.investment_cash enable row level security;
create policy "Users own investment_cash" on public.investment_cash for all using (auth.uid() = user_id);

-- Function to upsert investment cash balance
create or replace function public.upsert_investment_cash(
  p_user_id uuid,
  p_currency text,
  p_amount numeric
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.investment_cash (user_id, currency, balance)
  values (p_user_id, p_currency, p_amount)
  on conflict (user_id, currency)
  do update set
    balance = public.investment_cash.balance + p_amount,
    updated_at = now();
end;
$$;
