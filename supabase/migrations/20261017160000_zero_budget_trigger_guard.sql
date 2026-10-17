-- Zero-budget guard for check_budget_limits trigger
-- Prevents triggering alerts when monthly_limit is NULL or <= 0

CREATE OR REPLACE FUNCTION public.check_budget_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_budget record;
    v_total_spent numeric;
    v_threshold_80 numeric;
    v_month int;
    v_year int;
    v_fingerprint text;
BEGIN
    IF NEW.type != 'expense' THEN RETURN NEW; END IF;

    v_month := extract(month from NEW.transaction_date);
    v_year := extract(year from NEW.transaction_date);

    -- Find relevant budget
    SELECT * INTO v_budget
    FROM public.budgets
    WHERE user_id = NEW.user_id
      AND category = NEW.category
      AND month = v_month
      AND year = v_year;

    IF NOT FOUND THEN RETURN NEW; END IF;

    -- Zero/NULL budget guard
    IF v_budget.monthly_limit IS NULL OR v_budget.monthly_limit <= 0 THEN RETURN NEW; END IF;

    -- Calculate total spent this month for this category
    SELECT COALESCE(sum(amount), 0) INTO v_total_spent
    FROM public.transactions
    WHERE user_id = NEW.user_id
      AND category = NEW.category
      AND transaction_date >= make_date(v_year, v_month, 1)
      AND transaction_date < make_date(v_year, v_month, 1) + interval '1 month'
      AND type = 'expense';

    -- Check 100%+ first
    IF v_total_spent >= v_budget.monthly_limit THEN
        v_threshold_80 := 100;
        v_fingerprint := 'budget_' || v_threshold_80 || '_' || v_budget.id || '_' || v_month || '_' || v_year;
        IF NOT EXISTS (
            SELECT 1 FROM public.alerts
            WHERE user_id = NEW.user_id
              AND title LIKE '%تجاوزت ميزانية%'
              AND fingerprint = v_fingerprint
              AND created_at >= now() - interval '24 hours'
        ) THEN
            INSERT INTO public.alerts (user_id, type, title, message, frequency, is_read, is_active, fingerprint)
            VALUES (
                NEW.user_id,
                'budget',
                '🚨 تجاوزت ميزانية ' || v_budget.category || '!',
                'أنفقت ' || round(v_total_spent, 2) || ' من أصل ' || round(v_budget.monthly_limit, 2) || ' — تجاوزت الميزانية بـ ' || round(v_total_spent - v_budget.monthly_limit, 2),
                'daily',
                false,
                true,
                v_fingerprint
            );
        END IF;
        RETURN NEW;
    END IF;

    -- Check 80%+
    v_threshold_80 := 80;
    IF v_total_spent >= v_budget.monthly_limit * 0.8 THEN
        v_fingerprint := 'budget_' || v_threshold_80 || '_' || v_budget.id || '_' || v_month || '_' || v_year;
        IF NOT EXISTS (
            SELECT 1 FROM public.alerts
            WHERE user_id = NEW.user_id
              AND title LIKE '%وصلت 80%' OR title LIKE '%وصلت%'
              AND fingerprint = v_fingerprint
              AND created_at >= now() - interval '24 hours'
        ) THEN
            INSERT INTO public.alerts (user_id, type, title, message, frequency, is_read, is_active, fingerprint)
            VALUES (
                NEW.user_id,
                'budget',
                '⚠️ ميزانية ' || v_budget.category || ' وصلت ' || round((v_total_spent / v_budget.monthly_limit) * 100) || '%',
                'أنفقت ' || round(v_total_spent, 2) || ' من أصل ' || round(v_budget.monthly_limit, 2) || ' — تبقى ' || round(v_budget.monthly_limit - v_total_spent, 2),
                'daily',
                false,
                true,
                v_fingerprint
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Recreate trigger if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'check_budget_limits_trigger') THEN
        DROP TRIGGER check_budget_limits_trigger ON public.transactions;
    END IF;
    CREATE TRIGGER check_budget_limits_trigger
        AFTER INSERT ON public.transactions
        FOR EACH ROW
        EXECUTE FUNCTION public.check_budget_limits();
END;
$$;
