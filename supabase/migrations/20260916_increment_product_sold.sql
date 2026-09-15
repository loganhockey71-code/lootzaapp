-- Lootza: real sales tracking for real (Stripe-backed) products.
--
-- WHERE TO RUN THIS:
--   Supabase Dashboard -> SQL Editor -> New query -> paste this whole file -> Run.
--   Requires 20260826_create_products.sql to already be applied. Safe to re-run.
--
-- 20260826_create_products.sql deliberately left `sold` (and rating/reviews/
-- likes) off this table — at the time, all engagement stats were simulated
-- client-side for both mock and real listings. That's still true for
-- rating/reviews/likes, but `sold` now needs to be real: a seller's dashboard
-- shows their actual revenue (price * sold), and that was permanently $0 for
-- every real listing with no way to ever become accurate. This adds the
-- column and the function app/api/stripe/webhook uses to increment it.

alter table public.products
  add column if not exists sold integer not null default 0;

comment on column public.products.sold is
  'Real completed-purchase count, incremented by increment_product_sold()
   from app/api/stripe/webhook — the only writer. Everything else
   (rating/reviews/likes) is still simulated client-side; sold is the one
   engagement stat with an actual Stripe payment behind every unit.';

-- A plain `update products set sold = sold + 1` from app code would need to
-- read the current value first (supabase-js/PostgREST has no "column = column
-- + 1" update syntax), which is a race under concurrent purchases of the same
-- product. This function does the increment as a single atomic statement
-- instead.
create or replace function public.increment_product_sold(p_product_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.products
  set sold = sold + 1
  where id = p_product_id;
$$;

grant execute on function public.increment_product_sold(uuid) to service_role;
