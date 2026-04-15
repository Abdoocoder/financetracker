-- =============================================
-- Soft Delete Migration for Pull Sync
-- =============================================

-- Add deleted_at column to transactions
alter table public.transactions 
add column if not exists deleted_at timestamptz;

-- Add deleted_at column to debts
alter table public.debts 
add column if not exists deleted_at timestamptz;

-- Add deleted_at column to investments
alter table public.investments 
add column if not exists deleted_at timestamptz;

-- Add deleted_at column to budgets
alter table public.budgets 
add column if not exists deleted_at timestamptz;

-- Add deleted_at column to savings_goals
alter table public.savings_goals 
add column if not exists deleted_at timestamptz;

-- Add deleted_at column to accounts (future use)
alter table public.accounts 
add column if not exists deleted_at timestamptz;

-- Add deleted_at column to recurring_transactions (future use)
alter table public.recurring_transactions 
add column if not exists deleted_at timestamptz;

-- Add indexes for efficient soft delete queries
create index if not exists idx_transactions_deleted_at 
on public.transactions(deleted_at) where deleted_at is not null;

create index if not exists idx_debts_deleted_at 
on public.debts(deleted_at) where deleted_at is not null;

create index if not exists idx_investments_deleted_at 
on public.investments(deleted_at) where deleted_at is not null;

create index if not exists idx_budgets_deleted_at 
on public.budgets(deleted_at) where deleted_at is not null;

create index if not exists idx_savings_goals_deleted_at 
on public.savings_goals(deleted_at) where deleted_at is not null;

-- Create updated_at index for efficient sync queries
create index if not exists idx_transactions_updated_sync 
on public.transactions(updated_at desc) where deleted_at is null;

create index if not exists idx_debts_updated_sync 
on public.debts(updated_at desc) where deleted_at is null;

create index if not exists idx_investments_updated_sync 
on public.investments(updated_at desc) where deleted_at is null;

create index if not exists idx_budgets_updated_sync 
on public.budgets(updated_at desc) where deleted_at is null;

create index if not exists idx_savings_goals_updated_sync 
on public.savings_goals(updated_at desc) where deleted_at is null;

-- Create function to get changed records since timestamp
create or replace function public.get_changed_records(
  p_user_id uuid,
  p_table_name text,
  p_since timestamptz,
  p_page_size int default 1000,
  p_offset int default 0
)
returns table (
  id uuid,
  data jsonb,
  operation text,
  changed_at timestamptz
) as $$
begin
  return query
  execute format(
    'select id, to_jsonb(t)::jsonb, 
     case when deleted_at is not null then ''delete'' 
          when created_at = updated_at then ''create'' 
          else ''update'' end,
     coalesce(updated_at, created_at)
     from public.%I 
     where user_id = p_user_id 
       and (deleted_at is null or deleted_at > p_since)
       and coalesce(updated_at, created_at) > p_since
     order by coalesce(updated_at, created_at)
     limit p_page_size offset p_offset',
    p_table_name
  );
end;
$$ language plpgsql security definer;

-- Create function to get deleted records since timestamp
create or replace function public.get_deleted_records(
  p_user_id uuid,
  p_table_name text,
  p_since timestamptz
)
returns table (id uuid, deleted_at timestamptz) as $$
begin
  return query
  execute format(
    'select id, deleted_at from public.%I 
     where user_id = p_user_id 
       and deleted_at is not null 
       and deleted_at > p_since',
    p_table_name
  );
end;
$$ language plpgsql security definer;