-- Chat tables for AI Assistant (Feature A)
-- Migration: 041_chats.sql

-- Chats table
create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'New Chat',
  provider_id text not null, -- from SUPPORTED_PROVIDERS keys
  model text,                -- specific model used (optional override)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Messages table
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text not null,
  provider_id text,          -- provider used for this message (assistant messages)
  tokens_used int,           -- optional: track token usage
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_chats_user_id on public.chats(user_id);
create index if not exists idx_chats_user_updated on public.chats(user_id, updated_at desc);
create index if not exists idx_messages_chat_id on public.messages(chat_id);
create index if not exists idx_messages_chat_created on public.messages(chat_id, created_at);

-- RLS: users only see their own chats/messages
alter table public.chats enable row level security;
alter table public.messages enable row level security;

create policy "Users can view own chats"
  on public.chats for select
  using (auth.uid() = user_id);

create policy "Users can insert own chats"
  on public.chats for insert
  with check (auth.uid() = user_id);

create policy "Users can update own chats"
  on public.chats for update
  using (auth.uid() = user_id);

create policy "Users can delete own chats"
  on public.chats for delete
  using (auth.uid() = user_id);

create policy "Users can view messages in own chats"
  on public.messages for select
  using (exists (
    select 1 from public.chats c
    where c.id = messages.chat_id and c.user_id = auth.uid()
  ));

create policy "Users can insert messages in own chats"
  on public.messages for insert
  with check (exists (
    select 1 from public.chats c
    where c.id = messages.chat_id and c.user_id = auth.uid()
  ));

-- Updated_at trigger (reuse existing function if available)
create or replace function public.update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists update_chats_updated_at on public.chats;
create trigger update_chats_updated_at
  before update on public.chats
  for each row execute function public.update_updated_at_column();

-- Grant for Data API (enforced 2026-10-30)
grant select, insert, update, delete on public.chats to authenticated;
grant select, insert, update, delete on public.messages to authenticated;