-- =============================================
-- 021_accounting_logic_functions.sql
-- المركزية المحاسبية: وظائف قاعدة البيانات لحساب الأرصدة وصافي الثروة
-- =============================================

-- 1. وظيفة حساب أرصدة الحسابات بدقة
-- تعتمد على الرصيد الافتتاحي + مجموع العمليات (دخل - مصروف + تحويل داخل - تحويل خارج)
create or replace function public.get_account_balances(p_user_id uuid)
returns table (
  account_id uuid,
  account_name text,
  current_balance numeric
) as $$
begin
  return query
  with tx_summary as (
    select
      a.id as acc_id,
      coalesce(sum(case when t.type = 'income' then t.amount else 0 end), 0) as income,
      coalesce(sum(case when t.type = 'expense' then t.amount else 0 end), 0) as expense,
      coalesce(sum(case when t.type = 'transfer' and t.transfer_to_account_id = a.id then t.amount else 0 end), 0) as xfer_in,
      coalesce(sum(case when t.type = 'transfer' and t.account_id = a.id then t.amount else 0 end), 0) as xfer_out
    from public.accounts a
    left join public.transactions t on t.account_id = a.id or t.transfer_to_account_id = a.id
    where a.user_id = p_user_id and a.is_archived = false
    group by a.id
  )
  select
    a.id,
    a.name,
    (a.opening_balance + s.income - s.expense + s.xfer_in - s.xfer_out)::numeric as current_balance
  from public.accounts a
  join tx_summary s on s.acc_id = a.id
  where a.user_id = p_user_id and a.is_archived = false;
end;
$$ language plpgsql security definer;

-- 2. وظيفة لوحة المعلومات المالية الشاملة (Dashbord Stats)
-- تحسب صافي الثروة، الديون، والاستثمارات في معاملة واحدة
create or replace function public.get_financial_dashboard(
  p_user_id uuid,
  p_usd_to_local_rate double precision default 1.0
)
returns json as $$
declare
  v_total_accounts numeric;
  v_investments_usd numeric;
  v_investments_local numeric;
  v_goals_saved numeric;
  v_total_owed numeric;
  -- v_total_receivable is currently omitted in dashboard but we'll include it for accuracy
  v_total_receivable numeric;
  v_investment_cash_usd numeric;
  v_net_worth numeric;
begin
  -- 1. مجموع أرصدة الحسابات التابعة للمستخدم
  select coalesce(sum(current_balance), 0)
  into v_total_accounts
  from public.get_account_balances(p_user_id);

  -- 2. قيمة الاستثمارات (الأسهم والعملات الرقمية مضروبة في سعرها الحالي)
  select coalesce(sum(shares * current_price), 0)
  into v_investments_usd
  from public.investments
  where user_id = p_user_id;

  v_investments_local := v_investments_usd * p_usd_to_local_rate;

  -- 3. الكاش الموجود في حسابات الاستثمار
  select coalesce(sum(balance), 0)
  into v_investment_cash_usd
  from public.investment_cash
  where user_id = p_user_id;

  -- 4. مدخرات الأهداف
  select coalesce(sum(current_amount), 0)
  into v_goals_saved
  from public.savings_goals
  where user_id = p_user_id;

  -- 5. الديون (مطلوبة ومحلية)
  select
    coalesce(sum(case when debt_type = 'owed' then remaining_amount else 0 end), 0),
    coalesce(sum(case when debt_type = 'receivable' then remaining_amount else 0 end), 0)
  into v_total_owed, v_total_receivable
  from public.debts
  where user_id = p_user_id and is_paid = false;

  -- 6. حساب صافي الثروة النهائي
  v_net_worth := v_total_accounts + v_investments_local + (v_investment_cash_usd * p_usd_to_local_rate) + v_goals_saved + v_total_receivable - v_total_owed;

  return json_build_object(
    'net_worth', v_net_worth,
    'total_accounts_balance', v_total_accounts,
    'investments_value_local', v_investments_local,
    'investments_value_usd', v_investments_usd,
    'investment_cash_local', v_investment_cash_usd * p_usd_to_local_rate,
    'goals_saved', v_goals_saved,
    'total_debt_owed', v_total_owed,
    'total_receivable', v_total_receivable
  );
end;
$$ language plpgsql security definer;

-- 3. وظيفة حساب الزكاة بدقة شرعية
create or replace function public.get_zakat_summary(
  p_user_id uuid,
  p_gold_price_per_gram double precision,
  p_silver_price_per_gram double precision,
  p_usd_to_local_rate double precision default 1.0
)
returns json as $$
declare
  v_dash json;
  v_nisab_gold numeric;
  v_nisab_silver numeric;
  v_nisab_effective numeric;
  v_zakatable_assets numeric;
  v_zakat_due numeric;
  v_is_eligible boolean;
begin
  -- جلب بيانات لوحة المعلومات (أصول المستحدم)
  v_dash := public.get_financial_dashboard(p_user_id, p_usd_to_local_rate);

  -- حساب النصاب (الذهب 85ج، الفضة 595ج)
  v_nisab_gold := 85 * p_gold_price_per_gram;
  v_nisab_silver := 595 * p_silver_price_per_gram;

  -- الممارسة الفضلى (الأقل منهما لصالح الفقير - غالباً الفضة حالياً)
  v_nisab_effective := least(v_nisab_gold, v_nisab_silver);

  -- الوعاء الزكوي = (النقد + المدخرات + الاستثمارات) - الديون التي تنقص الوعاء
  v_zakatable_assets := (v_dash->>'total_accounts_balance')::numeric
                      + (v_dash->>'investments_value_local')::numeric
                      + (v_dash->>'investment_cash_local')::numeric
                      + (v_dash->>'goals_saved')::numeric
                      - (v_dash->>'total_debt_owed')::numeric;

  -- شرط بلوغ النصاب
  if v_zakatable_assets >= v_nisab_effective then
    v_is_eligible := true;
    v_zakat_due := v_zakatable_assets * 0.025; -- نسبة 2.5% للسنة القمرية
  else
    v_is_eligible := false;
    v_zakat_due := 0;
  end if;

  return json_build_object(
    'is_eligible', v_is_eligible,
    'zakat_due', v_zakat_due,
    'zakatable_assets', v_zakatable_assets,
    'nisab_gold', v_nisab_gold,
    'nisab_silver', v_nisab_silver,
    'nisab_effective', v_nisab_effective
  );
end;
$$ language plpgsql security definer;
