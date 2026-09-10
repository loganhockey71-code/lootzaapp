-- Lootza: restore baseline Postgres grants for service_role/authenticated/anon.
--
-- WHERE TO RUN THIS:
--   Supabase Dashboard -> SQL Editor -> New query -> paste this whole file -> Run.
--   Safe to re-run.
--
-- DIAGNOSED 2026-09-10: server-side code (lib/supabase/admin.ts, used by
-- app/api/download, app/api/checkout, app/api/stripe/webhook) was getting
-- "42501 permission denied for table products/purchases" using the
-- service_role key, and anon was getting the same on public.profiles and
-- public.purchases. This is NOT Row Level Security doing its job — RLS only
-- restricts which ROWS a role can see once it's already allowed to touch the
-- table at all. This error means the baseline GRANTs Supabase normally sets
-- on every table (for service_role especially, which is supposed to bypass
-- RLS and have full access unconditionally) were missing for these specific
-- tables. Most likely cause: this project paused and resumed, and some
-- object-level grants applied outside Supabase's managed migration system
-- didn't survive that. public.products was unaffected; public.profiles and
-- public.purchases were not — this restores the standard Supabase defaults
-- project-wide so it can't silently happen again for a table added later.
--
-- After this runs, RLS policies from the earlier migrations are what
-- actually restrict anon/authenticated to the right rows — this migration
-- does not loosen any row-level access, only restores the ability to
-- attempt the query at all.

grant usage on schema public to service_role, authenticated, anon;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

grant select on all tables in schema public to anon;

-- So a table created by a future migration gets the same defaults
-- automatically, without needing this fixed again by hand.
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on functions to service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;
alter default privileges in schema public grant select on tables to anon;
