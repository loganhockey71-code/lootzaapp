-- Lootza: real product/listing table, RLS, and updated_at trigger.
--
-- WHERE TO RUN THIS:
--   Supabase Dashboard -> SQL Editor -> New query -> paste this whole file -> Run.
--   Requires the `profiles` migration (20260826_create_profiles.sql) to already
--   be applied, since seller_id references it. Safe to run once; re-running
--   after a partial failure will not duplicate objects (IF NOT EXISTS / OR
--   REPLACE / DROP ... IF EXISTS throughout).

-- ---------------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------------

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,

  -- Core listing content
  title text not null,
  tagline text not null default '',
  description text not null default '', -- newline-separated paragraphs, same shape the frontend already splits on
  slug text not null unique,
  category text not null check (category in ('gaming', 'graphics', 'social', 'web', 'creator', 'ai')),
  tags text[] not null default '{}',

  -- Pricing — numeric, never floating point, for money
  price numeric(10, 2) not null check (price >= 0),
  original_price numeric(10, 2) check (original_price is null or original_price >= 0),
  usage_rights text not null default 'Personal Use' check (usage_rights in ('Personal Use', 'Commercial Use')),

  -- Listing metadata the frontend already renders
  file_types text[] not null default '{}',
  compatible_with text[] not null default '{}',
  whats_included text[] not null default '{}',
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),

  -- Media (see note in the report about thumbnail_url's temporary data-URL storage)
  thumbnail_url text,
  preview_images text[] not null default '{}',

  -- Merchandising / drop state
  badge text check (badge is null or badge in ('trending', 'new', 'featured')),
  limited_quantity_total integer check (limited_quantity_total is null or limited_quantity_total > 0),
  limited_quantity_remaining integer check (limited_quantity_remaining is null or limited_quantity_remaining >= 0),
  release_at timestamptz,

  status text not null default 'active' check (status in ('draft', 'active', 'archived')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint products_limited_quantity_order check (
    limited_quantity_remaining is null
    or limited_quantity_total is null
    or limited_quantity_remaining <= limited_quantity_total
  )
);

comment on table public.products is
  'Real seller-created listings. Engagement stats (rating/reviews/likes/sold) are
   intentionally NOT here — those belong to systems this migration does not touch
   and continue to be simulated client-side, same as for mock/seed products.';

create index if not exists products_seller_id_idx on public.products (seller_id);
create index if not exists products_category_idx on public.products (category);
create index if not exists products_status_created_at_idx on public.products (status, created_at desc);

-- ---------------------------------------------------------------------------
-- 2. updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.set_products_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
  before update on public.products
  for each row
  execute function public.set_products_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Row Level Security
-- ---------------------------------------------------------------------------

alter table public.products enable row level security;

-- Public can read active listings...
drop policy if exists "Active products are viewable by everyone" on public.products;
create policy "Active products are viewable by everyone"
  on public.products for select
  using (status = 'active');

-- ...and a seller can always see all of their own listings, any status.
drop policy if exists "Sellers can view their own products" on public.products;
create policy "Sellers can view their own products"
  on public.products for select
  using (auth.uid() = seller_id);

drop policy if exists "Sellers can create their own products" on public.products;
create policy "Sellers can create their own products"
  on public.products for insert
  with check (auth.uid() = seller_id);

drop policy if exists "Sellers can update their own products" on public.products;
create policy "Sellers can update their own products"
  on public.products for update
  using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id);

drop policy if exists "Sellers can delete their own products" on public.products;
create policy "Sellers can delete their own products"
  on public.products for delete
  using (auth.uid() = seller_id);
