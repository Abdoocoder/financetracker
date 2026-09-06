-- =============================================
-- Add missing indexes for foreign keys
-- =============================================

-- alerts.user_id
CREATE INDEX IF NOT EXISTS idx_alerts_user_id
  ON public.alerts(user_id);

-- debt_payments.debt_id and user_id
CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id
  ON public.debt_payments(debt_id);

CREATE INDEX IF NOT EXISTS idx_debt_payments_user_id
  ON public.debt_payments(user_id);

-- investment_transactions.investment_id and user_id
CREATE INDEX IF NOT EXISTS idx_investment_transactions_investment_id
  ON public.investment_transactions(investment_id);

CREATE INDEX IF NOT EXISTS idx_investment_transactions_user_id
  ON public.investment_transactions(user_id);

-- saving_challenges.user_id
CREATE INDEX IF NOT EXISTS idx_saving_challenges_user_id
  ON public.saving_challenges(user_id);

-- savings_goals.user_id
CREATE INDEX IF NOT EXISTS idx_savings_goals_user_id
  ON public.savings_goals(user_id);

-- testimonials.user_id
CREATE INDEX IF NOT EXISTS idx_testimonials_user_id
  ON public.testimonials(user_id);
