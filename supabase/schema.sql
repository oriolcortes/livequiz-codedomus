-- LiveQuiz by CodeDomus - Supabase schema
-- Run this in Supabase SQL Editor after creating the project.

create extension if not exists pgcrypto;

create type public.app_role as enum ('free', 'trusted', 'owner');
create type public.room_status as enum ('active', 'ended', 'expired');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  display_name text,
  role public.app_role not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_id uuid not null references public.profiles(id) on delete cascade,
  status public.room_status not null default 'active',
  max_students integer not null check (max_students between 1 and 200),
  max_questions integer not null check (max_questions between 1 and 100),
  estimated_messages integer not null check (estimated_messages > 0),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ended_at timestamptz
);

create index if not exists rooms_code_status_idx on public.rooms(code, status);
create index if not exists rooms_host_created_idx on public.rooms(host_id, created_at desc);
create index if not exists rooms_active_expiry_idx on public.rooms(status, expires_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'free'
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = excluded.display_name;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'free'::public.app_role);
$$;

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;

-- PROFILES
create policy "profiles_select_own_or_owner"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.current_user_role() = 'owner');

create policy "profiles_owner_update_all"
on public.profiles
for update
to authenticated
using (public.current_user_role() = 'owner')
with check (public.current_user_role() = 'owner');

-- ROOMS
create policy "rooms_authenticated_select_all_metadata"
on public.rooms
for select
to authenticated
using (true);

create policy "rooms_anon_select_active_by_code"
on public.rooms
for select
to anon
using (status = 'active' and expires_at > now());

create policy "rooms_host_insert"
on public.rooms
for insert
to authenticated
with check (host_id = auth.uid());

create policy "rooms_host_update"
on public.rooms
for update
to authenticated
using (host_id = auth.uid())
with check (host_id = auth.uid());

-- Explicit Data API grants for new Supabase projects.
grant usage on schema public to anon, authenticated;
grant select on public.rooms to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant insert, select, update on public.rooms to authenticated;
grant execute on function public.current_user_role() to authenticated;

-- Optional cleanup helper. You can run it manually or schedule it later with pg_cron if you enable it.
create or replace function public.expire_stale_rooms()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.rooms
  set status = 'expired', ended_at = now()
  where status = 'active' and expires_at < now();

  get diagnostics affected = row_count;
  return affected;
end;
$$;

grant execute on function public.expire_stale_rooms() to authenticated;

-- Manual role management examples:
-- update public.profiles set role = 'owner' where email = 'your-email@example.com';
-- update public.profiles set role = 'trusted' where email in ('teacher1@example.com', 'teacher2@example.com');
