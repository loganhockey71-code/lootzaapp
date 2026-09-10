import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { PLATFORM_FEE_BPS } from "@/lib/config/fees";

// Requires a "Terms of service" URL to already be set in the Stripe Dashboard
// (Settings -> Public business information) — Stripe rejects session creation
// outright if that's missing, which would break every checkout. Off by
// default for exactly that reason; flip to "true" in the environment only
// after that Dashboard field is filled in. See .env.example.
const COLLECT_TOS_CONSENT = process.env.STRIPE_COLLECT_TOS_CONSENT === "true";

/**
 * POST /api/checkout
 * Authorization: Bearer <supabase access token>
 * Body: { productId: string }
 *
 * Creates a Stripe Checkout session for a real Supabase product. The title
 * and price are always read from the product row in this route — never from
 * the request body — so a client can't check out for less than the listed
 * price. No purchases row is created here; that only happens once Stripe
 * confirms payment, via app/api/stripe/webhook.
 *
 * Refuses to sell a product until its seller has a Stripe Connect account
 * with payouts enabled — see app/api/stripe/connect — so a sale is never
 * taken with no way to actually pay the seller.
 */
export async function POST(request: NextRequest) {
  let body: { productId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const productId = typeof body.productId === "string" ? body.productId : null;
  if (!productId) {
    return NextResponse.json({ error: "Missing productId." }, { status: 400 });
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  if (!token) {
    return NextResponse.json({ error: "You must be logged in to buy this." }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Your session has expired. Please log in again." }, { status: 401 });
  }
  const buyerId = userData.user.id;

  const { data: product, error: productError } = await supabaseAdmin
    .from("products")
    .select("id, seller_id, title, price, slug, status")
    .eq("id", productId)
    .maybeSingle();

  if (productError) {
    return NextResponse.json({ error: "Failed to look up this product." }, { status: 500 });
  }
  if (!product || product.status !== "active") {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }
  if (product.seller_id === buyerId) {
    return NextResponse.json({ error: "You can't buy your own product." }, { status: 400 });
  }

  const { data: sellerProfile, error: sellerError } = await supabaseAdmin
    .from("profiles")
    .select("stripe_account_id, stripe_payouts_enabled")
    .eq("id", product.seller_id)
    .maybeSingle();
  if (sellerError) {
    return NextResponse.json({ error: "Failed to look up the seller." }, { status: 500 });
  }
  if (!sellerProfile?.stripe_account_id || !sellerProfile.stripe_payouts_enabled) {
    return NextResponse.json(
      { error: "This seller hasn't finished setting up payouts yet, so this product can't be bought right now." },
      { status: 400 }
    );
  }

  const { data: existingPurchase, error: purchaseError } = await supabaseAdmin
    .from("purchases")
    .select("id")
    .eq("buyer_id", buyerId)
    .eq("product_id", productId)
    .eq("status", "completed")
    .maybeSingle();
  if (purchaseError) {
    return NextResponse.json({ error: "Failed to verify ownership." }, { status: 500 });
  }
  if (existingPurchase) {
    return NextResponse.json({ error: "You already own this product." }, { status: 400 });
  }

  const price = Number(product.price);
  const unitAmount = Math.round(price * 100);
  const origin = new URL(request.url).origin;

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: unitAmount,
          product_data: { name: product.title },
        },
      },
    ],
    // Destination charge: the platform is the merchant of record, and this
    // much of the charge is transferred to the seller's connected account
    // once it succeeds. The rest (the platform fee) stays in the platform's
    // own Stripe balance.
    payment_intent_data: {
      application_fee_amount: Math.round((unitAmount * PLATFORM_FEE_BPS) / 10000),
      transfer_data: { destination: sellerProfile.stripe_account_id },
    },
    metadata: {
      product_id: product.id,
      buyer_id: buyerId,
      seller_id: product.seller_id,
    },
    client_reference_id: buyerId,
    success_url: `${origin}/product/${product.slug}?checkout=success`,
    cancel_url: `${origin}/product/${product.slug}?checkout=cancel`,
    ...(COLLECT_TOS_CONSENT ? { consent_collection: { terms_of_service: "required" as const } } : {}),
  });

  if (!session.url) {
    return NextResponse.json({ error: "Failed to create checkout session." }, { status: 500 });
  }

  return NextResponse.json({ url: session.url });
}
