import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

async function authenticate(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

/**
 * GET /api/stripe/connect
 * Authorization: Bearer <supabase access token>
 *
 * Returns the caller's own Stripe Connect payout status, so the dashboard
 * can show "set up payouts" vs "payouts enabled" without needing a Stripe
 * call on every page load.
 */
export async function GET(request: NextRequest) {
  const user = await authenticate(request);
  if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("stripe_account_id, stripe_payouts_enabled")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile) {
    return NextResponse.json({ error: "Failed to look up payout status." }, { status: 500 });
  }

  return NextResponse.json({
    connected: !!profile.stripe_account_id,
    payoutsEnabled: profile.stripe_payouts_enabled,
  });
}

/**
 * POST /api/stripe/connect
 * Authorization: Bearer <supabase access token>
 *
 * Creates (first call) or reuses (later calls) a Stripe Express connected
 * account for the caller, then returns a fresh Account Link URL to send them
 * through Stripe's hosted onboarding. Account Links are single-use and
 * expire quickly, so this always mints a new one rather than caching it.
 */
export async function POST(request: NextRequest) {
  const user = await authenticate(request);
  if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("stripe_account_id")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || !profile) {
    return NextResponse.json({ error: "Failed to look up your profile." }, { status: 500 });
  }

  const stripe = getStripe();
  let accountId = profile.stripe_account_id;

  if (!accountId) {
    // Country is fixed to US for now — Lootza only prices in USD everywhere
    // else (see lib/utils.ts formatPrice), so this is a real assumption, not
    // an oversight. Supporting other countries needs collecting a seller's
    // actual country and is out of scope here.
    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
    accountId = account.id;

    const { error: saveError } = await supabaseAdmin
      .from("profiles")
      .update({ stripe_account_id: accountId })
      .eq("id", user.id);
    if (saveError) {
      return NextResponse.json({ error: "Failed to save your payout account." }, { status: 500 });
    }
  }

  const origin = new URL(request.url).origin;
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/dashboard?connect=refresh`,
    return_url: `${origin}/dashboard?connect=return`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: accountLink.url });
}
