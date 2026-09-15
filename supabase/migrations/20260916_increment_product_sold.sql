-- Lootza: atomic `products.sold` increment for real (Stripe-backed) purchases.
--
-- WHERE TO RUN THIS:
--   Supabase Dashboard -> SQL Editor -> New query -> paste this whole file -> Run.
--   Requires 20260826_create_products.sql to already be applied. Safe to re-run.
--
-- Real listings' `sold` count was never incremented anywhere — it's set to 0
-- at creation (see lib/supabase/products.ts mapProductRow) and nothing ever
-- updated it, so a real seller's dashboard showed 0 sales and $0 revenue
-- forever regardless of actual completed purchases. app/api/stripe/webhook
-- now calls this after a genuinely new completion (see fulfillCheckoutSession).
--
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
  set sold = sold + 1, updated_at = now()
  where id = p_product_id;
$$;

grant execute on function public.increment_product_sold(uuid) to service_role;
