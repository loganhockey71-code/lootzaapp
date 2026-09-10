-- Lootza: buyer purchases / ownership records.
--
-- WHERE TO RUN THIS:
--   Supabase Dashboard -> SQL Editor -> New query -> paste this whole file -> Run.
--   Requires 20260826_create_profiles.sql and 20260826_create_products.sql to
--   already be applied. Safe to re-run (IF NOT EXISTS / OR REPLACE / DROP
--   POLICY IF EXISTS throughout).

-- ---------------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------------

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  price numeric(10, 2) not null check (price >= 0),
  status text not null default 'completed' check (status in ('pending', 'completed', 'refunded')),
  created_at timestamptz not null default now(),

  constraint purchases_buyer_product_unique unique (buyer_id, product_id),
  constraint purchases_no_self_purchase check (buyer_id <> seller_id)
);

comment on table public.purchases is
  'One row per successful buy. No real payment yet (no Stripe) — status is
   forced to ''completed'' by the trigger below the moment a row is created.
   seller_id and price are NOT trusted from the client; a trigger overwrites
   them from the authoritative products row so a buyer cannot misattribute a
   sale or record a fake price.';

create index if not exists purchases_seller_id_idx on public.purchases (seller_id);
create index if not exists purchases_product_id_idx on public.purchases (product_id);

-- ---------------------------------------------------------------------------
-- 2. Authoritative fields — mirrors the protect_profile_progression pattern
--    used for profiles: the client can request a purchase, but seller_id,
--    price, and status always come from the real product row, never the
--    client's payload.
-- ---------------------------------------------------------------------------

create or replace function public.set_purchase_authoritative_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  prod record;
begin
  select seller_id, price into prod from public.products where id = new.product_id;
  if not found then
    raise exception 'Product % does not exist', new.product_id;
  end if;

  new.seller_id := prod.seller_id;
  new.price := prod.price;
  new.status := 'completed';
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists trg_purchases_authoritative on public.purchases;
create trigger trg_purchases_authoritative
  before insert on public.purchases
  for each row
  execute function public.set_purchase_authoritative_fields();

-- ---------------------------------------------------------------------------
-- 3. Row Level Security
-- ---------------------------------------------------------------------------

alter table public.purchases enable row level security;

drop policy if exists "Buyers can view their own purchases" on public.purchases;
create policy "Buyers can view their own purchases"
  on public.purchases for select
  using (auth.uid() = buyer_id);

drop policy if exists "Sellers can view sales of their products" on public.purchases;
create policy "Sellers can view sales of their products"
  on public.purchases for select
  using (auth.uid() = seller_id);

drop policy if exists "Buyers can create their own purchases" on public.purchases;
create policy "Buyers can create their own purchases"
  on public.purchases for insert
  to authenticated
  with check (auth.uid() = buyer_id);

-- No update/delete policy for anyone — purchase records are permanent from the client's
-- perspective. (The trigger above already blocks buying your own product: it sets the
-- real seller_id before the purchases_no_self_purchase check runs.)
