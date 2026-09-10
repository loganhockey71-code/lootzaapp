-- Lootza: Storage buckets + policies for product previews and product files.
--
-- WHERE TO RUN THIS:
--   Supabase Dashboard -> SQL Editor -> New query -> paste this whole file -> Run.
--   Safe to re-run (ON CONFLICT / DROP POLICY IF EXISTS throughout).
--
-- If bucket creation via SQL is ever rejected by your project's permissions,
-- create the buckets by hand instead — see the report for exact dashboard
-- steps — then just run section 2 (policies) below on its own.

-- ---------------------------------------------------------------------------
-- 1. Buckets
-- ---------------------------------------------------------------------------

-- Cover/preview images — publicly viewable, capped at 10MB per file.
insert into storage.buckets (id, name, public, file_size_limit)
values ('product-previews', 'product-previews', true, 10485760)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

-- The actual digital product file — PRIVATE, capped at 50MB per file (see the
-- report re: Supabase's free-tier upload limits before raising this).
insert into storage.buckets (id, name, public, file_size_limit)
values ('product-files', 'product-files', false, 52428800)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

-- ---------------------------------------------------------------------------
-- 2. Policies
--
-- Every upload is stored at "<seller_id>/<product_id>/<filename>". Ownership
-- is enforced by checking that the first path segment equals the caller's own
-- auth id — (storage.foldername(name))[1] = auth.uid()::text — so a seller can
-- only write inside their own folder, never another seller's.
-- ---------------------------------------------------------------------------

-- product-previews: readable by everyone (it's a public bucket), writable only
-- by the owner of that path prefix.

drop policy if exists "Preview images are viewable by everyone" on storage.objects;
create policy "Preview images are viewable by everyone"
  on storage.objects for select
  using (bucket_id = 'product-previews');

drop policy if exists "Sellers can upload their own preview images" on storage.objects;
create policy "Sellers can upload their own preview images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-previews'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Sellers can update their own preview images" on storage.objects;
create policy "Sellers can update their own preview images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-previews' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'product-previews' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Sellers can delete their own preview images" on storage.objects;
create policy "Sellers can delete their own preview images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-previews' and (storage.foldername(name))[1] = auth.uid()::text);

-- product-files: PRIVATE. No select policy exists for anyone but the owner —
-- there is deliberately no public/anon read policy at all, so nobody can
-- browse or download another seller's file, and no public URL will ever work
-- against this bucket.

drop policy if exists "Sellers can view their own product files" on storage.objects;
create policy "Sellers can view their own product files"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'product-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Sellers can upload their own product files" on storage.objects;
create policy "Sellers can upload their own product files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'product-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Sellers can update their own product files" on storage.objects;
create policy "Sellers can update their own product files"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-files' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'product-files' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Sellers can delete their own product files" on storage.objects;
create policy "Sellers can delete their own product files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-files' and (storage.foldername(name))[1] = auth.uid()::text);
