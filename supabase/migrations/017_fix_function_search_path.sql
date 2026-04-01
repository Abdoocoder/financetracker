-- Fix mutable search_path on security definer function
-- See: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
create or replace function public.upsert_investment_cash(
  p_user_id uuid,
  p_currency text,
  p_amount numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.investment_cash (user_id, currency, balance)
  values (p_user_id, p_currency, p_amount)
  on conflict (user_id, currency)
  do update set
    balance = public.investment_cash.balance + p_amount,
    updated_at = now();
end;
$$;
