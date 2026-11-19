-- Uzbit: accounts, judge attempts, and saved drafts.
-- Run once in the Supabase SQL editor (or with `supabase db push`).
-- Every table is protected by row level security: a user can only read and write their own rows.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  problem_id text not null,
  language text not null,
  code text not null,
  verdict text not null,
  passed integer not null default 0,
  total integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists attempts_user_problem_idx on public.attempts (user_id, problem_id, created_at desc);

create table if not exists public.drafts (
  user_id uuid not null references auth.users (id) on delete cascade,
  problem_id text not null,
  language text not null,
  code text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, problem_id, language)
);

-- Create a profile automatically when someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row level security: own rows only.
alter table public.profiles enable row level security;
alter table public.attempts enable row level security;
alter table public.drafts enable row level security;

create policy "profiles: read own" on public.profiles for select using (auth.uid() = id);
create policy "profiles: update own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "attempts: read own" on public.attempts for select using (auth.uid() = user_id);
create policy "attempts: insert own" on public.attempts for insert with check (auth.uid() = user_id);
create policy "attempts: delete own" on public.attempts for delete using (auth.uid() = user_id);

create policy "drafts: read own" on public.drafts for select using (auth.uid() = user_id);
create policy "drafts: write own" on public.drafts for insert with check (auth.uid() = user_id);
create policy "drafts: update own" on public.drafts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "drafts: delete own" on public.drafts for delete using (auth.uid() = user_id);
