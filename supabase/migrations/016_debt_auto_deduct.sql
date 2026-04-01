-- Add auto_deduct and payment_day columns to debts table
alter table public.debts
  add column if not exists auto_deduct boolean default false,
  add column if not exists payment_day int check (payment_day between 1 and 31);
