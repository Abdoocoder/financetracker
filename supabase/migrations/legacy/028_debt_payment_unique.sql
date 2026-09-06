-- Prevent duplicate auto-payments for the same debt in the same calendar month.

-- Step 1: Remove duplicate rows, keeping the earliest record per (debt_id, month).
delete from public.debt_payments
where id not in (
  select distinct on (debt_id, date_trunc('month', payment_date::timestamp))
    id
  from public.debt_payments
  order by debt_id, date_trunc('month', payment_date::timestamp), created_at asc
);

-- Step 2: Create the unique index to prevent future duplicates.
create unique index if not exists idx_debt_payments_debt_month_unique
  on public.debt_payments (debt_id, date_trunc('month', payment_date::timestamp));
