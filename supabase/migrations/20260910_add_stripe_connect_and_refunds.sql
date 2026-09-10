-- Lootza: Stripe Connect seller payouts + refund correlation.
--
-- WHERE TO RUN THIS:
--   Supabase Dashboard -> SQL Editor -> New query -> paste this whole file -> Run.
--   Requires 20260826_create_profiles.sql and 20260828_create_purchases.sql to
--   already be applied. Safe to re-run (IF NOT EXISTS / CREATE OR REPLACE throughout).

-- ---------------------------------------------------------------------------
-- 1. Seller payout state, on profiles.
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists stripe_account_id text,
  add column if not exists stripe_payouts_enabled boolean not null default false;

comment on column public.profiles.stripe_account_id is
  'Stripe Connect Express account id for this seller (acct_...). Set only by
   app/api/stripe/connect via the service-role client.';
comment on column public.profiles.stripe_payouts_enabled is
  'True once Stripe confirms (via the account.updated webhook) this seller''s
   connected account can actually receive transfers. app/api/checkout refuses
   to sell this seller''s products for real money until this is true, so a
   sale is never taken without a way to pay the seller.';

-- ---------------------------------------------------------------------------
-- 2. Extend the existing anti-tampering trigger so these two columns are
--    locked the same way level/xp/coins/is_seller already are: any update
--    not made via the service-role client (i.e. not from our own server
--    code) silently reverts them, so a buyer can't PATCH their own profile
--    from devtools to fake payout-readiness.
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
    new.stripe_account_id := old.stripe_account_id;
    new.stripe_payouts_enabled := old.stripe_payouts_enabled;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Correlate a purchases row back to the Stripe payment that created it, so
--    a later `charge.refunded` webhook event can find and refund the right
--    row. Nullable: older/demo purchases never had a real Stripe payment.
-- ---------------------------------------------------------------------------

alter table public.purchases
  add column if not exists stripe_payment_intent_id text;

create unique index if not exists purchases_stripe_payment_intent_id_key
  on public.purchases (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

comment on column public.purchases.stripe_payment_intent_id is
  'Stripe PaymentIntent id for this purchase, set by app/api/stripe/webhook
   when it fulfills a completed Checkout Session. Used to find the right row
   when a charge.refunded event comes in later.';
