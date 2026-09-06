-- =============================================
-- 019_accounts.sql
-- نظام الحسابات المالية (بنك / نقد / توفير / بطاقة ائتمان)
-- =============================================

-- 1. جدول الحسابات
create table public.accounts (
  id            uuid        default uuid_generate_v4() primary key,
  user_id       uuid        references public.profiles(id) on delete cascade not null,
  name          text        not null,
  type          text        not null check (type in ('cash', 'bank', 'savings', 'credit_card')),
  opening_balance numeric(15,2) default 0,
  currency      text        default 'JOD',
  color         text        default '#3B7EF6',
  icon          text        default '🏦',
  is_default    boolean     default false,
  is_archived   boolean     default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table public.accounts enable row level security;

create policy "users_own_accounts" on public.accounts
  for all using (auth.uid() = user_id);

create index idx_accounts_user on public.accounts(user_id);

-- حساب افتراضي واحد فقط لكل مستخدم
create unique index idx_accounts_default
  on public.accounts(user_id) where is_default = true;

-- trigger للـ updated_at
create trigger handle_accounts_updated_at
  before update on public.accounts
  for each row execute procedure public.handle_updated_at();

-- =============================================
-- 2. تعديل جدول transactions
-- =============================================

-- إضافة account_id (nullable للتوافق مع البيانات القديمة)
alter table public.transactions
  add column if not exists account_id uuid references public.accounts(id) on delete set null;

create index if not exists idx_transactions_account on public.transactions(account_id);

-- إضافة دعم التحويلات بين الحسابات
alter table public.transactions
  add column if not exists transfer_to_account_id uuid references public.accounts(id) on delete set null,
  add column if not exists transfer_pair_id uuid;

-- إضافة نوع 'transfer' للمعاملات
do $$
begin
  -- حذف الـ constraint القديم وإعادته مع transfer
  alter table public.transactions drop constraint if exists transactions_type_check;
  alter table public.transactions
    add constraint transactions_type_check
    check (type in ('income', 'expense', 'transfer'));
exception when others then
  null;
end;
$$;

-- =============================================
-- 3. إنشاء الحساب الافتراضي للمستخدمين الحاليين
-- =============================================

create or replace function public.create_default_account_for_user(p_user_id uuid)
returns uuid as $$
declare
  v_account_id  uuid;
  v_opening_bal numeric;
  v_currency    text;
begin
  select opening_balance, currency
  into v_opening_bal, v_currency
  from public.profiles where id = p_user_id;

  insert into public.accounts (user_id, name, type, opening_balance, currency, is_default, icon, color)
  values (
    p_user_id,
    'الحساب الرئيسي',
    'bank',
    coalesce(v_opening_bal, 0),
    coalesce(v_currency, 'JOD'),
    true,
    '🏦',
    '#3B7EF6'
  )
  returning id into v_account_id;

  -- تعيين كل المعاملات الحالية لهذا الحساب
  update public.transactions
  set account_id = v_account_id
  where user_id = p_user_id and account_id is null;

  return v_account_id;
end;
$$ language plpgsql security definer;

-- تشغيل على كل المستخدمين الحاليين
do $$
declare
  r record;
begin
  for r in select id from public.profiles loop
    begin
      perform public.create_default_account_for_user(r.id);
    exception when unique_violation then
      null; -- مستخدم لديه حساب افتراضي بالفعل
    end;
  end loop;
end;
$$;

-- =============================================
-- 4. Trigger: تعيين الحساب الافتراضي تلقائياً
--    إذا أُضيفت معاملة بدون account_id
-- =============================================

create or replace function public.assign_default_account()
returns trigger as $$
begin
  if new.account_id is null and new.type != 'transfer' then
    select id into new.account_id
    from public.accounts
    where user_id = new.user_id and is_default = true
    limit 1;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists set_default_account on public.transactions;
create trigger set_default_account
  before insert on public.transactions
  for each row execute procedure public.assign_default_account();
