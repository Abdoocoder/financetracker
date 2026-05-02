-- Enforce that remaining_amount_foreign is always consistent with
-- remaining_amount and exchange_rate. This prevents the two apps from
-- diverging whenever one of them forgets to compute the foreign amount.
--
-- Rule: remaining_amount_foreign = remaining_amount / exchange_rate
-- (exchange_rate = 1 for same-currency debts, so foreign = base in that case)

CREATE OR REPLACE FUNCTION sync_debt_remaining_foreign()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.exchange_rate IS NULL OR NEW.exchange_rate <= 0 THEN
    NEW.remaining_amount_foreign := NEW.remaining_amount;
  ELSE
    NEW.remaining_amount_foreign := NEW.remaining_amount / NEW.exchange_rate;
  END IF;
  RETURN NEW;
END;
$$;

-- Fire on every INSERT and UPDATE that touches remaining_amount or exchange_rate
CREATE OR REPLACE TRIGGER debt_sync_remaining_foreign
BEFORE INSERT OR UPDATE OF remaining_amount, exchange_rate ON debts
FOR EACH ROW EXECUTE FUNCTION sync_debt_remaining_foreign();

-- Back-fill existing rows that have stale remaining_amount_foreign values
UPDATE debts
SET remaining_amount_foreign = CASE
  WHEN exchange_rate IS NULL OR exchange_rate <= 0 THEN remaining_amount
  ELSE remaining_amount / exchange_rate
END
WHERE is_paid = false;
