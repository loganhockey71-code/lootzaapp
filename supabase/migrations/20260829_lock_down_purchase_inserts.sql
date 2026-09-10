-- Lootza: lock down purchases inserts to the server (Stripe webhook) only.
--
-- WHERE TO RUN THIS:
--   Supabase Dashboard -> SQL Editor -> New query -> paste this whole file -> Run.
--   Requires 20260828_create_purchases.sql to already be applied. Safe to re-run
--   (DROP POLICY IF EXISTS).
--
-- Real payments now go through Stripe Checkout (see app/api/checkout and
-- app/api/stripe/webhook). A purchases row is only ever inserted by the
-- webhook, using the service-role client, after Stripe confirms payment.
-- Authenticated clients no longer need insert access — leaving the old
-- policy in place would let any signed-in buyer grant themselves a real
-- product for free by inserting a purchases row directly (e.g. from the
-- browser console), bypassing payment entirely.

drop policy if exists "Buyers can create their own purchases" on public.purchases;

-- No insert policy is added in its place. RLS defaults to deny for
-- authenticated/anon roles, and the service-role client used by the webhook
-- bypasses RLS entirely — so that webhook is the only way purchases rows
-- get created from here on. The existing SELECT policies (buyers viewing
-- their own purchases, sellers viewing their sales) are unaffected.
