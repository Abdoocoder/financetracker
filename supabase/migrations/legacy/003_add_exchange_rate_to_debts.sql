-- =============================================
-- Add exchange_rate column to Debts Table
-- =============================================

ALTER TABLE public.debts 
ADD COLUMN exchange_rate numeric(10,6) DEFAULT 1.0;

-- Backfill existing debts: If currency is not base currency, try to guess from existing data
-- Since we already have original_amount (base) and original_amount_foreign
-- rate = original_amount / original_amount_foreign
UPDATE public.debts 
SET exchange_rate = CASE 
    WHEN original_amount_foreign > 0 THEN original_amount / original_amount_foreign
    ELSE 1.0 
END;
