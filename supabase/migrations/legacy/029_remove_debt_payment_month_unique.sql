-- Remove the unique constraint that prevented multiple manual payments
-- in the same calendar month for the same debt.
-- This constraint was intended to block duplicate AUTO-payments only,
-- but it also blocked legitimate manual payments.

drop index if exists idx_debt_payments_debt_month_unique;
