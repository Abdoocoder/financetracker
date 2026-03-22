-- =============================================
-- Multi-Currency Support Migration
-- =============================================

-- 1. Update Transactions Table
ALTER TABLE public.transactions 
ADD COLUMN original_amount numeric(10,2),
ADD COLUMN original_currency text,
ADD COLUMN exchange_rate numeric(10,6);

-- Backfill existing transactions
UPDATE public.transactions 
SET original_amount = amount, 
    original_currency = (SELECT currency FROM public.profiles WHERE profiles.id = transactions.user_id),
    exchange_rate = 1.0;

-- 2. Update Debt Payments Table
ALTER TABLE public.debt_payments 
ADD COLUMN original_amount numeric(10,2),
ADD COLUMN original_currency text,
ADD COLUMN exchange_rate numeric(10,6);

-- Backfill existing debt payments
UPDATE public.debt_payments 
SET original_amount = amount, 
    original_currency = (SELECT currency FROM public.profiles WHERE profiles.id = debt_payments.user_id),
    exchange_rate = 1.0;

-- 3. Update Debts Table
ALTER TABLE public.debts 
ADD COLUMN original_amount_foreign numeric(10,2),
ADD COLUMN remaining_amount_foreign numeric(10,2),
ADD COLUMN currency text;

-- Backfill existing debts
UPDATE public.debts 
SET original_amount_foreign = original_amount,
    remaining_amount_foreign = remaining_amount,
    currency = (SELECT currency FROM public.profiles WHERE profiles.id = debts.user_id);
