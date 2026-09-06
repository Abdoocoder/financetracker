-- Add purchase_date to investments for accurate haul (زكاة) calculation
ALTER TABLE public.investments
ADD COLUMN IF NOT EXISTS purchase_date date DEFAULT NULL;

-- Backfill existing records using created_at date
UPDATE public.investments
SET purchase_date = created_at::date
WHERE purchase_date IS NULL;
