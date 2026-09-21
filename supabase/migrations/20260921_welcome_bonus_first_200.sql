-- Lootza: $10 worth of coins (1,000 coins) for the first 200 users.
--
-- WHERE TO RUN THIS:
--   Supabase Dashboard -> SQL Editor -> New query -> paste this whole file -> Run.
--   Requires 20260826_create_profiles.sql to already be applied. Safe to re-run.
--
-- The cap has to be enforced here, not in the client: the client can't be
-- trusted to count "how many users already got it". claim_welcome_bonus() does
-- the count + grant in one transaction under an advisory lock, so two people
-- claiming at the same moment can't both squeeze into the last slot, and each
-- user can only ever be granted it once.
--
-- Rate: 100 coins = $1 (the base rate of the $1.99 -> 200 coin package), so
-- $10 = 1,000 coins.

alter table public.profiles
  add column if not exists welcome_bonus_claimed_at timestamptz;

comment on column public.profiles.welcome_bonus_claimed_at is
  'Set by claim_welcome_bonus() when this user received the first-200-users
   coin bonus. Non-null = already claimed; at most 200 rows may have it set.';

-- profiles.coins is locked against client writes by protect_profile_progression()
-- (only service_role may change it). claim_welcome_bonus() runs as the calling
-- user, so it raises a transaction-local flag that the trigger honours. Clients
-- can't set it: PostgREST only exposes functions in the public schema, and
-- set_config() lives in pg_catalog.
create or replace function public.protect_profile_progression()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'service_role'
     and coalesce(current_setting('lootza.allow_progression', true), '') <> 'on' then
    new.level := old.level;
    new.xp := old.xp;
    new.coins := old.coins;
    new.is_seller := old.is_seller;
    new.stripe_account_id := old.stripe_account_id;
    new.stripe_payouts_enabled := old.stripe_payouts_enabled;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- Returns the number of coins granted right now: 1000 on the call that wins a
-- slot, 0 if the user already claimed, the 200 slots are gone, or not signed in.
create or replace function public.claim_welcome_bonus()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  bonus_coins constant integer := 1000;
  max_recipients constant integer := 200;
  uid uuid := auth.uid();
  claimed_count integer;
begin
  if uid is null then
    return 0;
  end if;

  -- Serialise all claims so the count below can't go stale mid-transaction.
  perform pg_advisory_xact_lock(hashtext('lootza_welcome_bonus'));

  if exists (
    select 1 from public.profiles
    where id = uid and welcome_bonus_claimed_at is not null
  ) then
    return 0;
  end if;

  select count(*) into claimed_count
  from public.profiles
  where welcome_bonus_claimed_at is not null;

  if claimed_count >= max_recipients then
    return 0;
  end if;

  perform set_config('lootza.allow_progression', 'on', true);

  update public.profiles
  set coins = coins + bonus_coins,
      welcome_bonus_claimed_at = now()
  where id = uid;

  if not found then
    return 0;
  end if;

  return bonus_coins;
end;
$$;

revoke all on function public.claim_welcome_bonus() from public, anon;
grant execute on function public.claim_welcome_bonus() to authenticated;

-- How many slots are left, for a "X of 200 left" banner. Read-only, safe for anon.
create or replace function public.welcome_bonus_slots_left()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select greatest(0, 200 - count(*))::integer
  from public.profiles
  where welcome_bonus_claimed_at is not null;
$$;

grant execute on function public.welcome_bonus_slots_left() to anon, authenticated;
