-- 🚀 Add performance indexes for scalable SaaS
-- Recommended to ensure speed at 10,000+ users

-- Debts table: Filter by user and unpaid status
CREATE INDEX IF NOT EXISTS idx_debts_user_unpaid ON public.debts(user_id) WHERE is_paid = false;

-- Investments table: Filter by user
CREATE INDEX IF NOT EXISTS idx_investments_user ON public.investments(user_id);

-- Budgets table: Index for frequent monthly/yearly queries per user
CREATE INDEX IF NOT EXISTS idx_budgets_user_date ON public.budgets(user_id, year, month);
