-- Migration: Rename 'دين' (Religion/Charity) category to 'تبرعات' (Donations)
-- Date: 2026-11-07
-- Reason: UX improvement - 'دين' (Religion) was confused with 'ديون' (Debts)
-- The new term 'تبرعات' (Donations) is clearer for charity/religious giving

-- Update existing transactions with category 'دين' to 'تبرعات'
UPDATE public.transactions
SET category = 'تبرعات',
    updated_at = now()
WHERE category = 'دين';

-- Note: This only affects the 'دين' (Religion/Charity) category
-- The 'ديون' (Debts) category remains unchanged as it's used for debt repayment tracking

-- Verify the change
-- SELECT DISTINCT category FROM public.transactions WHERE category IN ('دين', 'تبرعات', 'ديون') ORDER BY category;