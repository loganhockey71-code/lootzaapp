-- Lootza: add the private product-file path column to products.
--
-- WHERE TO RUN THIS:
--   Supabase Dashboard -> SQL Editor -> New query -> paste this whole file -> Run.
--   Requires 20260826_create_products.sql to already be applied. Safe to re-run
--   (IF NOT EXISTS guards it).

alter table public.products
  add column if not exists product_file_path text;

comment on column public.products.product_file_path is
  'Path (not a public URL) to the seller''s uploaded file inside the private
   product-files Storage bucket, e.g. "<seller_id>/<product_id>/<filename>".
   Never expose this as a public URL — buyer downloads are a separate,
   not-yet-built entitlements step that will mint short-lived signed URLs.';
