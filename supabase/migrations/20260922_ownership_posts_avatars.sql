-- Lootza: per-account ownership, real posts, avatars, and tighter RLS/grants.
--
-- WHERE TO RUN THIS:
--   Supabase Dashboard -> SQL Editor -> New query -> paste this whole file -> Run.
--   Requires every earlier migration (profiles, products, storage buckets,
--   purchases, stripe connect, restore_role_grants, welcome bonus) to already
--   be applied. Safe to re-run.
--
-- What this does:
--   1. profiles  - stops clients writing anything but their own username /
--                  display name / avatar / bio, stops clients inserting
--                  profile rows, and hides the Stripe columns from the
--                  public "viewable by everyone" read.
--   2. products  - seller_id defaults to the caller and can't be forged
--                  (RLS already checked it); clients can no longer set or
--                  edit `sold` (revenue) or `limited_quantity_remaining`.
--   3. posts     - NEW table for Discover videos/photos. Every row is owned
--                  by an author_id; public read, owner-only write.
--   4. Storage   - NEW `avatars` and `post-media` buckets, writable only
--                  inside the caller's own "<user id>/" folder.

-- ---------------------------------------------------------------------------
-- 1. profiles
-- ---------------------------------------------------------------------------

-- Profile rows are created only by the on_auth_user_created trigger
-- (security definer). A client inserting its own row could pick its own
-- level/xp/coins, so remove that path entirely.
drop policy if exists "Users can insert their own profile" on public.profiles;
revoke insert on public.profiles from anon, authenticated;

-- Column-level grants. The row-level policies still decide WHICH rows; these
-- decide which COLUMNS. Server code (service_role) is unaffected.
revoke update on public.profiles from anon, authenticated;
grant update (username, display_name, avatar_url, bio) on public.profiles to authenticated;

-- Everyone can read a profile's public fields; stripe_account_id /
-- stripe_payouts_enabled / welcome_bonus_claimed_at are deliberately absent.
revoke select on public.profiles from anon, authenticated;
grant select (id, username, display_name, avatar_url, bio, level, xp, coins, is_seller, created_at, updated_at)
  on public.profiles to anon, authenticated;

-- An avatar_url must point at a file inside the avatars bucket, in the
-- owner's own folder - so a profile can't be pointed at someone else's image
-- or at an arbitrary tracking URL. NOT VALID: enforced for every new write
-- without failing on any pre-existing row.
alter table public.profiles drop constraint if exists profiles_avatar_url_own_folder;
alter table public.profiles
  add constraint profiles_avatar_url_own_folder
  check (avatar_url is null or avatar_url like '%/storage/v1/object/public/avatars/' || id::text || '/%')
  not valid;

-- ---------------------------------------------------------------------------
-- 2. products
-- ---------------------------------------------------------------------------

alter table public.products alter column seller_id set default auth.uid();

revoke insert, update on public.products from anon, authenticated;

-- Everything a seller legitimately supplies when listing. Not granted:
-- sold (webhook-only), created_at/updated_at (server-managed).
grant insert (
  id, seller_id, title, tagline, description, slug, category, tags, price, original_price,
  usage_rights, file_types, compatible_with, whats_included, file_size_bytes, thumbnail_url,
  preview_images, badge, limited_quantity_total, limited_quantity_remaining, release_at,
  status, product_file_path
) on public.products to authenticated;

-- Everything a seller may later edit. Not granted: id, seller_id (ownership
-- can't be transferred), sold, limited_quantity_remaining, timestamps.
grant update (
  title, tagline, description, slug, category, tags, price, original_price, usage_rights,
  file_types, compatible_with, whats_included, file_size_bytes, thumbnail_url, preview_images,
  badge, limited_quantity_total, release_at, status, product_file_path
) on public.products to authenticated;

-- ---------------------------------------------------------------------------
-- 3. posts (Discover videos / photos)
-- ---------------------------------------------------------------------------

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  type text not null check (type in ('video', 'image')),
  media_url text not null,
  category text check (category is null or category in ('gaming', 'graphics', 'social', 'web', 'creator', 'ai')),
  caption text not null default '' check (char_length(caption) <= 2000),
  linked_product_id uuid references public.products(id) on delete set null,
  collaborator_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.posts is
  'Creator videos/photos shown in Discover. author_id is the owner: public
   read, but only the author can create/edit/delete their own rows.';

create index if not exists posts_author_id_idx on public.posts (author_id);
create index if not exists posts_created_at_idx on public.posts (created_at desc);

alter table public.posts enable row level security;

drop policy if exists "Posts are viewable by everyone" on public.posts;
create policy "Posts are viewable by everyone"
  on public.posts for select
  using (true);

-- A post may only link to one of the author's OWN products.
drop policy if exists "Authors can create their own posts" on public.posts;
create policy "Authors can create their own posts"
  on public.posts for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and (
      linked_product_id is null
      or exists (
        select 1 from public.products p
        where p.id = linked_product_id and p.seller_id = auth.uid()
      )
    )
  );

drop policy if exists "Authors can update their own posts" on public.posts;
create policy "Authors can update their own posts"
  on public.posts for update
  to authenticated
  using (auth.uid() = author_id)
  with check (
    auth.uid() = author_id
    and (
      linked_product_id is null
      or exists (
        select 1 from public.products p
        where p.id = linked_product_id and p.seller_id = auth.uid()
      )
    )
  );

drop policy if exists "Authors can delete their own posts" on public.posts;
create policy "Authors can delete their own posts"
  on public.posts for delete
  to authenticated
  using (auth.uid() = author_id);

grant select on public.posts to anon, authenticated;
grant insert (id, author_id, type, media_url, category, caption, linked_product_id, collaborator_id)
  on public.posts to authenticated;
grant update (media_url, category, caption, linked_product_id, collaborator_id)
  on public.posts to authenticated;
grant delete on public.posts to authenticated;
grant all on public.posts to service_role;

-- ---------------------------------------------------------------------------
-- 4. Storage: avatars + post media
--
-- Files live at "<user id>/<filename>"; policies require the first path
-- segment to equal the caller's own auth id, exactly like product-previews.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-media', 'post-media', true, 52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- avatars
drop policy if exists "Avatars are viewable by everyone" on storage.objects;
create policy "Avatars are viewable by everyone"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- post-media
drop policy if exists "Post media is viewable by everyone" on storage.objects;
create policy "Post media is viewable by everyone"
  on storage.objects for select
  using (bucket_id = 'post-media');

drop policy if exists "Users can upload their own post media" on storage.objects;
create policy "Users can upload their own post media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update their own post media" on storage.objects;
create policy "Users can update their own post media"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete their own post media" on storage.objects;
create policy "Users can delete their own post media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'post-media' and (storage.foldername(name))[1] = auth.uid()::text);
