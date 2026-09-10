-- Lootza: user profiles table, RLS, and auto-provisioning trigger.
--
-- WHERE TO RUN THIS:
--   Supabase Dashboard -> SQL Editor -> New query -> paste this whole file -> Run.
--   Safe to run once. It only creates things (guarded with IF NOT EXISTS /
--   CREATE OR REPLACE / DROP ... IF EXISTS before recreating triggers), so
--   re-running it after a partial failure will not duplicate objects.

-- ---------------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text,
  avatar_url text,
  bio text,
  level integer not null default 1,
  xp integer not null default 0,
  coins integer not null default 0,
  is_seller boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_level_check check (level >= 1),
  constraint profiles_xp_check check (xp >= 0),
  constraint profiles_coins_check check (coins >= 0)
);

comment on table public.profiles is
  'One row per Supabase Auth user. username/display_name/avatar_url/bio are
   user-editable; level/xp/coins/is_seller are server-controlled progression
   fields protected from client writes by protect_profile_progression().';

-- ---------------------------------------------------------------------------
-- 2. Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;

drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No delete policy: nobody (except a service-role connection, which bypasses
-- RLS entirely) can delete a profile row from the client.

-- ---------------------------------------------------------------------------
-- 3. Anti-cheat: lock level/xp/coins/is_seller against client-side edits.
--
-- Even though the update policy above lets a user UPDATE their own row, this
-- trigger silently reverts those four columns back to their previous value on
-- every update UNLESS the request is authenticated as the Postgres service
-- role (i.e. a trusted server/Edge Function using the service_role key, never
-- the anon/publishable key used in the browser). This is what actually
-- prevents "editing coins/xp/level from devtools" from doing anything.
-- ---------------------------------------------------------------------------

create or replace function public.protect_profile_progression()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role' then
    new.level := old.level;
    new.xp := old.xp;
    new.coins := old.coins;
    new.is_seller := old.is_seller;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_progression on public.profiles;
create trigger trg_protect_profile_progression
  before update on public.profiles
  for each row
  execute function public.protect_profile_progression();

-- ---------------------------------------------------------------------------
-- 4. Auto-create a profile row whenever a new auth user signs up, pulling the
--    username from the signup metadata Lootza's signup form already sends
--    (supabase.auth.signUp({ options: { data: { username } } })).
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  desired_username text;
begin
  desired_username := coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), split_part(new.email, '@', 1));

  begin
    insert into public.profiles (id, username, display_name)
    values (new.id, desired_username, desired_username);
  exception
    when unique_violation then
      -- Desired username is taken — fall back to a guaranteed-unique one
      -- derived from the user's id so signup never fails because of this.
      insert into public.profiles (id, username, display_name)
      values (new.id, 'user_' || replace(new.id::text, '-', ''), desired_username);
  end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 5. Backfill: give any auth user created BEFORE this migration existed
--    (e.g. the test account used to verify Supabase Auth) a profile row too.
-- ---------------------------------------------------------------------------

do $$
declare
  u record;
  desired text;
begin
  for u in
    select au.id, au.email, au.raw_user_meta_data
    from auth.users au
    left join public.profiles p on p.id = au.id
    where p.id is null
  loop
    desired := coalesce(nullif(trim(u.raw_user_meta_data->>'username'), ''), split_part(u.email, '@', 1));
    begin
      insert into public.profiles (id, username, display_name) values (u.id, desired, desired);
    exception
      when unique_violation then
        insert into public.profiles (id, username, display_name)
        values (u.id, 'user_' || replace(u.id::text, '-', ''), desired);
    end;
  end loop;
end $$;
