-- =============================================
-- 023: Notification System Upgrade
-- =============================================

-- 1. Notification Category Enum
DO $$ BEGIN
    CREATE TYPE public.notification_category AS ENUM (
        'BudgetAlert', 
        'DebtReminder', 
        'SavingGoal', 
        'SystemUpdate', 
        'SecurityAlert'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Notification Preferences Table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id         uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id    uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    category   notification_category NOT NULL,
    enabled    boolean DEFAULT true,
    priority   text DEFAULT 'default' CHECK (priority IN ('low', 'default', 'high', 'max')),
    quiet_start time,
    quiet_end   time,
    mask_sensitive_data boolean DEFAULT false,
    updated_at  timestamptz DEFAULT now(),
    UNIQUE(user_id, category)
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own notification preferences" ON public.notification_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Trigger for updated_at in notification_preferences
CREATE TRIGGER handle_notif_pref_updated_at BEFORE UPDATE ON public.notification_preferences
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 3. Notification History Table
CREATE TABLE IF NOT EXISTS public.notification_history (
    id          uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id     uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    category    notification_category NOT NULL,
    title       text NOT NULL,
    body        text NOT NULL,
    data        jsonb DEFAULT '{}',
    fingerprint text, -- Hashing for de-duplication
    sent_at     timestamptz DEFAULT now(),
    is_read     boolean DEFAULT false,
    status      text DEFAULT 'delivered'
);

ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notification history" ON public.notification_history
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System management of notification history" ON public.notification_history
    FOR INSERT WITH CHECK (true); -- In reality, limited to service roles or triggers

-- 4. Notify User Utility Function
CREATE OR REPLACE FUNCTION public.notify_user(
    p_user_id       uuid,
    p_category      notification_category,
    p_title         text,
    p_body          text,
    p_data          jsonb DEFAULT '{}',
    p_fingerprint   text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    v_pref record;
BEGIN
    -- Check preferences
    SELECT enabled, priority, mask_sensitive_data, quiet_start, quiet_end 
    INTO v_pref
    FROM public.notification_preferences
    WHERE user_id = p_user_id AND category = p_category;

    IF v_pref.enabled = false THEN
        RETURN;
    END IF;

    -- De-duplication check (within 24h)
    IF p_fingerprint IS NOT NULL THEN
        IF EXISTS (
            SELECT 1 FROM public.notification_history
            WHERE user_id = p_user_id 
              AND fingerprint = p_fingerprint 
              AND sent_at > now() - interval '24 hours'
        ) THEN
            RETURN;
        END IF;
    END IF;

    -- Privacy Masking (Simplified example: replace numbers with *** if enabled)
    IF v_pref.mask_sensitive_data THEN
        p_body := regexp_replace(p_body, '\d+(\.\d+)?', '***', 'g');
    END IF;

    -- Insert into history (this can be picked up by Edge Functions or UI)
    INSERT INTO public.notification_history (user_id, category, title, body, data, fingerprint)
    VALUES (p_user_id, p_category, p_title, p_body, p_data, p_fingerprint);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Budget Alert Trigger Logic
CREATE OR REPLACE FUNCTION public.check_budget_limits()
RETURNS trigger AS $$
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

    -- Calculate total spent this month for this category
    SELECT COALESCE(sum(amount), 0) INTO v_total_spent
    FROM public.transactions
    WHERE user_id = NEW.user_id 
      AND category = NEW.category
      AND transaction_date >= make_date(v_year, v_month, 1)
      AND transaction_date < (make_date(v_year, v_month, 1) + interval '1 month');

    v_threshold_80 := v_budget.monthly_limit * 0.8;

    -- Check 100% Limit
    IF v_total_spent >= v_budget.monthly_limit THEN
        v_fingerprint := 'budget_100_' || v_budget.id || '_' || v_month || '_' || v_year;
        PERFORM public.notify_user(
            NEW.user_id, 
            'BudgetAlert', 
            'تنبيه: تجاوز الميزانية! ⚠️', 
            format('لقد تجاوزت ميزانية %s المحددة بـ %s. إجمالي المصروف: %s', NEW.category, v_budget.monthly_limit, v_total_spent),
            jsonb_build_object('budget_id', v_budget.id, 'url', '/main?tab=1'),
            v_fingerprint
        );
    -- Check 80% Threshold
    ELSIF v_total_spent >= v_threshold_80 THEN
        v_fingerprint := 'budget_80_' || v_budget.id || '_' || v_month || '_' || v_year;
        PERFORM public.notify_user(
            NEW.user_id, 
            'BudgetAlert', 
            'اكتمل 80% من الميزانية 📈', 
            format('لقد استهلكت %s من ميزانية %s المخصصة لهذا الشهر.', v_total_spent, NEW.category),
            jsonb_build_object('budget_id', v_budget.id, 'url', '/main?tab=1'),
            v_fingerprint
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution
DROP TRIGGER IF EXISTS trg_check_budget_limits ON public.transactions;
CREATE TRIGGER trg_check_budget_limits
    AFTER INSERT OR UPDATE ON public.transactions
    FOR EACH ROW EXECUTE PROCEDURE public.check_budget_limits();

-- 6. Initial Preferences for Existing Users
INSERT INTO public.notification_preferences (user_id, category)
SELECT id, cat
FROM public.profiles
CROSS JOIN unnest(enum_range(NULL::notification_category)) AS cat
ON CONFLICT DO NOTHING;
