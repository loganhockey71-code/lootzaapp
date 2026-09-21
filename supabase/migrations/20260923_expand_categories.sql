-- Lootza: allow any kind of digital product, not just the original six categories.
--
-- WHERE TO RUN THIS:
--   Supabase Dashboard -> SQL Editor -> New query -> paste this whole file -> Run.
--   Requires 20260826_create_products.sql and 20260922_ownership_posts_avatars.sql.
--   Safe to re-run.
--
-- products.category and posts.category were limited by CHECK constraints to
-- gaming/graphics/social/web/creator/ai, so any new category would be rejected
-- by the database. This replaces both with the full list (keep it in sync with
-- lib/data/categories.ts).

do $$
declare
  c record;
begin
  for c in
    select conrelid::regclass as tbl, conname
    from pg_constraint
    where contype = 'c'
      and conrelid in ('public.products'::regclass, 'public.posts'::regclass)
      and pg_get_constraintdef(oid) ilike '%category%'
  loop
    execute format('alter table %s drop constraint %I', c.tbl, c.conname);
  end loop;
end $$;

alter table public.products
  add constraint products_category_check check (category in (
    'gaming', 'graphics', 'social', 'web', 'creator', 'ai', 'ebooks', 'courses', 'music', 'video', 'photography', 'software', 'templates', 'printables', 'fonts', 'art', 'business', 'other'
  ));

alter table public.posts
  add constraint posts_category_check check (category is null or category in (
    'gaming', 'graphics', 'social', 'web', 'creator', 'ai', 'ebooks', 'courses', 'music', 'video', 'photography', 'software', 'templates', 'printables', 'fonts', 'art', 'business', 'other'
  ));
